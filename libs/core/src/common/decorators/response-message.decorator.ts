import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

export interface ResponseMessageOptions {
  /** MessageService namespace to look the key up in (default `core`). */
  namespace?: string;
  /**
   * `:param` values. `name` defaults to the controller's class name minus
   * "Controller" (BrandController -> "Brand"), same as BaseController#lang().
   */
  params?: Record<string, string>;
}

export interface ResponseMessageMetadata extends ResponseMessageOptions {
  key: string;
}

/**
 * `@ResponseMessage('create-success')` - TransformResponseInterceptor resolves
 * the key through MessageService#lang() and puts it in the envelope's
 * `message`, so the handler can just return its data. The declarative
 * counterpart of `this.success(this.lang('create-success'), data)`.
 */
export const ResponseMessage = (key: string, options: ResponseMessageOptions = {}) =>
  SetMetadata<string, ResponseMessageMetadata>(RESPONSE_MESSAGE_KEY, { key, ...options });
