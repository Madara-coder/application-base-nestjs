import { BaseResource } from '@cosmetic/nestjs-core';
import { BrandDocument } from './schemas/brand.schema';

/** Equivalent of a Brand-specific extension of Modules/Core/app/Transformers/BaseResource.php. */
export class BrandResource extends BaseResource<BrandDocument> {
  toJSON() {
    return this.withTimestamps({
      id: this.entity._id,
      name: this.entity.name,
      slug: this.entity.slug,
      description: this.entity.description ?? null,
      logo: this.entity.logo ?? null,
      website: this.entity.website ?? null,
      isActive: this.entity.isActive,
      sortOrder: this.entity.sortOrder,
    });
  }
}
