import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function isEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && ('message' in value || 'data' in value)
  );
}

/**
 * Global response envelope, equivalent of Modules/Core/app/Traits/ApiResponse.php.
 * Registered once via CoreModule (see core.module.ts) instead of every
 * controller extending an ApiResponse trait.
 *
 * A handler can either return BaseController::success()'s `{ message, data }`
 * shape directly (passed through as-is), or just return raw data/an array
 * and let this wrap it as `{ data }`.
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (payload === undefined) return {};
        if (isEnvelope(payload)) return payload;
        return { data: payload };
      }),
    );
  }
}
