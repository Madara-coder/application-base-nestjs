import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';

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

    if (exception instanceof MongooseError.CastError) {
      return { status: HttpStatus.BAD_REQUEST, message: `Invalid ${exception.path}.` };
    }

    if (exception instanceof MongooseError.ValidationError) {
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, message: this.formatMongooseValidation(exception) };
    }

    if (this.isDuplicateKeyError(exception)) {
      return { status: HttpStatus.CONFLICT, message: 'Duplicate entry.' };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong. Please try again later.',
    };
  }

  private formatMongooseValidation(exception: MongooseError.ValidationError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const validationErrors = exception.errors as unknown as Record<string, { message: string }>;
    for (const [field, error] of Object.entries(validationErrors)) {
      errors[field] = [error.message];
    }
    return errors;
  }

  /** Mongo duplicate-key error, equivalent of MySQL errno 1062 in the Laravel ExceptionHandler trait. */
  private isDuplicateKeyError(exception: unknown): boolean {
    return typeof exception === 'object' && exception !== null && (exception as { code?: number }).code === 11000;
  }
}
