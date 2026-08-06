import { timeAgo } from '../common/utils/time-ago.util';

/**
 * Equivalent of Modules/Core/app/Transformers/BaseResource.php (+ the
 * CustomResource/ResourceRelationships/ResourceTimestamps traits it pulls
 * in). A module resource extends this and implements toJSON() to pick /
 * reshape exactly the fields the API should expose - never return a raw
 * Mongoose document straight from a controller, since it carries internal
 * fields (deletedAt, __v, populated sub-documents) you don't want on the
 * wire.
 *
 * Usage:
 *   class BrandResource extends BaseResource<BrandDocument> {
 *     toJSON() {
 *       return this.withTimestamps({
 *         id: this.entity._id,
 *         name: this.entity.name,
 *         slug: this.entity.slug,
 *         creator: this.whenPopulated('creator', UserResource),
 *       });
 *     }
 *   }
 */
export abstract class BaseResource<T = any> {
  protected includeTimestamps = true;

  constructor(protected readonly entity: T) {}

  abstract toJSON(): Record<string, unknown>;

  static make<R extends BaseResource>(this: new (entity: any) => R, entity: any): Record<string, unknown> {
    return new this(entity).toJSON();
  }

  static collection<R extends BaseResource>(
    this: new (entity: any) => R,
    entities: any[],
  ): Record<string, unknown>[] {
    return entities.map((entity) => new this(entity).toJSON());
  }

  /**
   * Appends created_at/updated_at (+ human-readable diffs). Equivalent of
   * ResourceTimestamps::withTimeStamp().
   */
  protected withTimestamps(resource: Record<string, unknown>): Record<string, unknown> {
    if (!this.includeTimestamps) return resource;

    const createdAt: Date | undefined = (this.entity as any)?.createdAt;
    const updatedAt: Date | undefined = (this.entity as any)?.updatedAt;

    return {
      ...resource,
      createdAt: createdAt ?? null,
      createdAtHuman: timeAgo(createdAt),
      updatedAt: updatedAt ?? null,
      updatedAtHuman: timeAgo(updatedAt),
    };
  }

  /**
   * Equivalent of ResourceRelationships::relationshipResource() - only
   * renders the relation through `resourceClass` if it was actually
   * populated (Mongoose leaves an unpopulated ref as an ObjectId, which
   * `instanceof` won't match against a populated sub-document shape).
   */
  protected whenPopulated<R extends BaseResource>(
    field: string,
    resourceClass: new (entity: any) => R,
  ): Record<string, unknown> | null {
    const value = (this.entity as any)?.[field];
    const isPopulated = value && typeof value === 'object' && !(value as any)._bsontype;
    return isPopulated ? new resourceClass(value).toJSON() : null;
  }

  /**
   * Equivalent of CustomResource::customMake() - pick a handful of fields
   * off an arbitrary object without writing a dedicated Resource for them.
   */
  static pick(data: Record<string, unknown> | null | undefined, fields: string[]): Record<string, unknown> | null {
    if (!data) return null;
    return fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field] = (data as Record<string, unknown>)[field];
      return acc;
    }, {});
  }
}
