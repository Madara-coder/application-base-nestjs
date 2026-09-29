import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageService } from '../../i18n/message.service.js';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import type { ResponseMessageMetadata } from '../decorators/response-message.decorator.js';
import { SERIALIZE_RESOURCE_KEY } from '../decorators/serialize.decorator.js';
import type { ResourceClass } from '../decorators/serialize.decorator.js';
import { isPaginatedResult } from '../interfaces/paginated-result.interface.js';
import { ResponseEnvelope } from '../responses/response-envelope.js';

/**
 * Global response envelope, equivalent of Modules/Core/app/Traits/ApiResponse.php.
 * Registered once via CoreModule instead of every controller extending an
 * ApiResponse trait. Every response leaves as `{ message?, data? }`:
 *
 *  - A ResponseEnvelope (BaseController#success()) is passed through as-is.
 *  - Anything else is treated as the handler's data: shaped by the
 *    @Serialize(Resource) on the handler/controller if there is one, and
 *    paired with the @ResponseMessage(key) message if there is one.
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly messages: MessageService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];
    const resource = this.reflector.getAllAndOverride<ResourceClass | undefined>(SERIALIZE_RESOURCE_KEY, targets);
    const message = this.reflector.getAllAndOverride<ResponseMessageMetadata | undefined>(
      RESPONSE_MESSAGE_KEY,
      targets,
    );

    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof ResponseEnvelope) return payload;

        const data = resource ? this.serialize(resource, payload) : payload;
        return new ResponseEnvelope(message ? this.resolveMessage(message, context) : undefined, data);
      }),
    );
  }

  private serialize(resource: ResourceClass, payload: unknown): unknown {
    if (payload === null || payload === undefined) return payload;
    if (isPaginatedResult(payload)) return { ...payload, data: resource.collection(payload.data) };
    if (Array.isArray(payload)) return resource.collection(payload);
    return resource.make(payload);
  }

  private resolveMessage(metadata: ResponseMessageMetadata, context: ExecutionContext): string {
    const name = context.getClass().name.replace(/Controller$/, '');
    return this.messages.lang(metadata.key, { name, ...metadata.params }, metadata.namespace);
  }
}
