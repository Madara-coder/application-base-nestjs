import { BaseResource } from '@app/core';
import { Brand } from './entities/brand.entity.js';

/** Equivalent of a Brand-specific extension of Modules/Core/app/Transformers/BaseResource.php. */
export class BrandResource extends BaseResource<Brand> {
  toJSON() {
    return this.withTimestamps({
      id: this.entity.id,
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
