import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor.js';
import { MessageService } from '../../i18n/message.service.js';
import { ResponseMessage } from '../decorators/response-message.decorator.js';
import { Serialize } from '../decorators/serialize.decorator.js';
import { ResponseEnvelope } from '../responses/response-envelope.js';
import { BaseResource } from '../../resources/base.resource.js';

class WidgetResource extends BaseResource<{ id: string; secret: string }> {
  protected includeTimestamps = false;

  toJSON() {
    return { id: this.entity.id };
  }
}

@Serialize(WidgetResource)
class WidgetController {
  @ResponseMessage('fetch-success')
  show() {}

  @ResponseMessage('custom', { namespace: 'widget', params: { count: '3' } })
  custom() {}

  plain() {}
}

class RawController {
  handler() {}
}

describe('TransformResponseInterceptor', () => {
  const messages = new MessageService();
  messages.register('widget', { custom: ':count :name items' });
  const interceptor = new TransformResponseInterceptor(new Reflector(), messages);

  const run = (controller: new () => object, handler: string, payload: unknown) => {
    const context = {
      getClass: () => controller,
      getHandler: () => (controller.prototype as Record<string, unknown>)[handler],
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of(payload) };
    return lastValueFrom(interceptor.intercept(context, next));
  };

  it('serializes a single entity and resolves the message with the controller name', async () => {
    const result = await run(WidgetController, 'show', { id: 'w1', secret: 'x' });
    expect(result).toEqual(new ResponseEnvelope('Widget fetched successfully.', { id: 'w1' }));
  });

  it('serializes arrays and keeps pagination meta', async () => {
    const meta = { total: 1, perPage: 25, currentPage: 1, lastPage: 1 };

    expect(await run(WidgetController, 'plain', [{ id: 'a', secret: 'x' }])).toEqual({ data: [{ id: 'a' }] });
    expect(await run(WidgetController, 'plain', { data: [{ id: 'a', secret: 'x' }], meta })).toEqual({
      data: { data: [{ id: 'a' }], meta },
    });
  });

  it('uses a custom namespace and params', async () => {
    expect(await run(WidgetController, 'custom', undefined)).toEqual({ message: '3 Widget items' });
  });

  it('passes a ResponseEnvelope from BaseController#success() through untouched', async () => {
    const envelope = new ResponseEnvelope('Done.', { anything: true });
    expect(await run(WidgetController, 'show', envelope)).toBe(envelope);
  });

  it('wraps raw data without a resource or message, and returns {} for no data', async () => {
    expect(await run(RawController, 'handler', { data: [1], meta: {} })).toEqual({ data: { data: [1], meta: {} } });
    expect(await run(RawController, 'handler', undefined)).toEqual({});
  });
});
