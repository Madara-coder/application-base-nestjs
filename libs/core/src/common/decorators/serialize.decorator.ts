import { SetMetadata } from '@nestjs/common';

export const SERIALIZE_RESOURCE_KEY = 'serializeResource';

/** Anything with BaseResource's static make()/collection() - i.e. a BaseResource subclass. */
export interface ResourceClass {
  make(entity: unknown): Record<string, unknown>;
  collection(entities: unknown[]): Record<string, unknown>[];
}

/**
 * `@Serialize(BrandResource)` on a controller or handler - TransformResponseInterceptor
 * runs whatever the handler returns through the resource before it goes on
 * the wire: a single entity via make(), an array via collection(), and a
 * PaginatedResult via collection() on its `data` (keeping `meta`). Nest's
 * equivalent of ClassSerializerInterceptor + @SerializeOptions(), but using
 * BaseResource#toJSON() as the explicit output shape.
 */
export const Serialize = (resource: ResourceClass) => SetMetadata(SERIALIZE_RESOURCE_KEY, resource);
