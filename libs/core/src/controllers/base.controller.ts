import { MessageService } from '../i18n/message.service.js';
import { ResponseEnvelope } from '../common/responses/response-envelope.js';

/**
 * Equivalent of Modules/Core/app/Http/Controllers/BaseController.php, minus
 * the parts a global filter/interceptor now handles instead of a per-request
 * try/catch:
 *
 *  - successResponse()/errorResponse()  -> AllExceptionsFilter (errors) +
 *    just `return this.success(...)` here (success), enveloped identically
 *    by TransformResponseInterceptor either way.
 *  - handleException()/ExceptionHandler -> AllExceptionsFilter (global,
 *    registered once in CoreModule instead of duplicated per controller).
 *  - $this->authorize()                 -> PermissionsGuard + @Permissions().
 *
 * What's left is the part that's genuinely controller-specific: building the
 * `{ message, data }` envelope body and picking the right Resource class,
 * plus the same lang() shorthand as the Laravel version.
 *
 * For the common case - a fixed message key and one Resource per controller -
 * prefer the declarative @ResponseMessage() + @Serialize() decorators and just
 * return data (see BrandController); no base class needed. Extend this when a
 * handler builds its message at runtime (custom `:params`, conditional keys).
 */
export abstract class BaseController {
  protected modelName: string;
  protected transNamespace = 'core';

  constructor(protected readonly messages: MessageService) {
    this.modelName = this.constructor.name.replace(/Controller$/, '');
  }

  /** lang('create-success') -> "Brand created successfully." (defaults `:name` to this.modelName). */
  protected lang(key: string, params?: Record<string, string>): string {
    const resolvedParams = params && Object.keys(params).length > 0 ? params : { name: this.modelName };
    return this.messages.lang(key, resolvedParams, this.transNamespace);
  }

  /**
   * Builds the response body. Return this directly from a handler;
   * TransformResponseInterceptor passes a ResponseEnvelope through untouched
   * and the status code stays whatever `@HttpCode()` (or the Nest default) says.
   */
  protected success(message?: string | null, data?: unknown): ResponseEnvelope {
    return new ResponseEnvelope(message, data);
  }

  protected toResource(
    resourceClass: { make(entity: unknown): Record<string, unknown> },
    entity: unknown,
  ): Record<string, unknown> {
    return resourceClass.make(entity);
  }

  protected toCollection(
    resourceClass: { collection(entities: unknown[]): Record<string, unknown>[] },
    entities: unknown[],
  ): Record<string, unknown>[] {
    return resourceClass.collection(entities);
  }
}
