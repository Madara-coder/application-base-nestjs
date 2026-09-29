import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

/**
 * Driver error codes for the constraint violations the Laravel
 * ExceptionHandler trait special-cased (MySQL 1062 / 1451 / 1452), plus
 * their Postgres / SQLite / MSSQL equivalents, since TypeORM passes the raw
 * driver error through on QueryFailedError instead of normalizing it.
 */
const DUPLICATE_KEY_CODES = new Set(['23505', 'ER_DUP_ENTRY', '2627', '2601']);
const FOREIGN_KEY_CODES = new Set(['23503', 'ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2', '547']);
const NOT_NULL_CODES = new Set(['23502', 'ER_BAD_NULL_ERROR']);
// Malformed value for the column type, e.g. `GET /brands/not-a-uuid` on Postgres.
const INVALID_INPUT_CODES = new Set(['22P02', '22007', '22008', 'ER_TRUNCATED_WRONG_VALUE']);

/**
 * Global exception filter, equivalent of Modules/Core/app/Traits/ExceptionHandler.php.
 * Registered once via CoreModule so every module gets the same error JSON
 * shape (`{ message }`) and status-code mapping without a per-controller
 * try/catch + handleException() call.
 *
 * Throw a typed exception from common/exceptions/domain.exceptions.ts (or
 * any HttpException) from a service/repository for anything that needs a
 * specific status/message; everything else falls through to a generic 500
 * with a safe message, and gets logged.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionHandler');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ originalUrl?: string; url?: string; method: string }>();

    const { status, message } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        typeof message === 'string' ? message : JSON.stringify(message),
        exception instanceof Error ? exception.stack : undefined,
        `${request.method} ${request.originalUrl ?? request.url ?? ''}`,
      );
    }

    response.status(status).json({ message });
  }

  private resolve(exception: unknown): { status: number; message: string | Record<string, unknown> } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as Record<string, unknown>).message ?? exception.message);
      return { status: exception.getStatus(), message: message as string | Record<string, unknown> };
    }

    if (exception instanceof EntityNotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: 'Record not found.' };
    }

    if (exception instanceof QueryFailedError) {
      const code = this.driverErrorCode(exception);

      if (DUPLICATE_KEY_CODES.has(code) || this.isSqliteConstraint(exception, 'UNIQUE')) {
        return { status: HttpStatus.CONFLICT, message: 'Duplicate entry.' };
      }
      if (FOREIGN_KEY_CODES.has(code) || this.isSqliteConstraint(exception, 'FOREIGN KEY')) {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Cannot delete or update: this record is referenced elsewhere.',
        };
      }
      if (NOT_NULL_CODES.has(code) || this.isSqliteConstraint(exception, 'NOT NULL')) {
        return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'A required field is missing.' };
      }
      if (INVALID_INPUT_CODES.has(code)) {
        return { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong. Please try again later.',
    };
  }

  /** Postgres/MSSQL put the code on `code`/`number`; MySQL uses a string `code` like ER_DUP_ENTRY. */
  private driverErrorCode(exception: QueryFailedError): string {
    const driverError = (exception as QueryFailedError & { driverError?: Record<string, unknown> }).driverError ?? {};
    return String(driverError.code ?? driverError.number ?? '');
  }

  /**
   * SQLite (and sql.js) has no per-constraint error codes - only the message
   * says which kind failed, e.g. "UNIQUE constraint failed: brands.slug".
   */
  private isSqliteConstraint(exception: QueryFailedError, kind: string): boolean {
    return exception.message.includes(`${kind} constraint failed`);
  }
}
