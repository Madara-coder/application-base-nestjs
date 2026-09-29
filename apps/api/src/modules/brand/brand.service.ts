import { Injectable } from '@nestjs/common';
import { BaseCrudService } from '@app/core';
import { Brand } from './entities/brand.entity.js';
import { BrandRepository } from './brand.repository.js';

/**
 * Equivalent of Modules/Brand/app/Services/BrandService.php - which was
 * already just five one-line pass-throughs to the repository. Here that
 * boilerplate is gone entirely: BaseCrudService supplies index/show/store/
 * update/destroy/restore. This class only overrides store()/update() to
 * stamp createdBy/updatedBy, which is the one bit of real logic the Laravel
 * version had.
 */
@Injectable()
export class BrandService extends BaseCrudService<Brand> {
  constructor(private readonly brandRepository: BrandRepository) {
    super(brandRepository);
  }

  store<D>(data: D, userId?: string) {
    return this.brandRepository.create({ ...data, createdBy: userId } as Partial<Brand>);
  }

  update<D>(id: string, data: D, userId?: string) {
    return this.brandRepository.update(id, { ...data, updatedBy: userId } as Partial<Brand>);
  }
}
