import { timeAgo } from '../common/utils/time-ago.util.js';

/**
 * Equivalent of Modules/Core/app/Transformers/BaseResource.php (+ the
 * CustomResource/ResourceRelationships/ResourceTimestamps traits it pulls
 * in). A module resource extends this and implements toJSON() to pick /
 * reshape exactly the fields the API should expose - never return a raw
 * TypeORM entity straight from a controller, since it carries internal
 * fields (deletedAt, loaded relations, foreign keys) you don't want on the
 * wire.
 *
 * Usage:
 *   class BrandResource extends BaseResource<Brand> {
 *     toJSON() {
 *       return this.withTimestamps({
 *         id: this.entity.id,
 *         name: this.entity.name,
 *         slug: this.entity.slug,
 *         creator: this.whenLoaded('creator', UserResource),
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

  static collection<R extends BaseResource>(this: new (entity: any) => R, entities: any[]): Record<string, unknown>[] {
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
   * loaded (TypeORM leaves a relation that wasn't in `relations`/joined as
   * `undefined`, mirroring Eloquent's whenLoaded()). A loaded to-many
   * relation is rendered as a collection.
   */
  protected whenLoaded<R extends BaseResource>(
    field: string,
    resourceClass: new (entity: any) => R,
  ): Record<string, unknown> | Record<string, unknown>[] | null {
    const value = (this.entity as any)?.[field];
    if (Array.isArray(value)) return value.map((item) => new resourceClass(item).toJSON());
    const isLoaded = value !== null && typeof value === 'object' && !(value instanceof Date);
    return isLoaded ? new resourceClass(value).toJSON() : null;
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
