import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseRepository } from '@app/core';
import { Brand, BRAND_SEARCHABLE_FIELDS } from './entities/brand.entity.js';

/**
 * Equivalent of Modules/Brand/app/Repositories/BrandRepository.php. No CRUD
 * method needs overriding here - everything comes from BaseRepository.
 * Add brand-specific query methods (e.g. `findActive()`) directly on this
 * class when a plain findAll()/findOneBy() isn't enough.
 */
@Injectable()
export class BrandRepository extends BaseRepository<Brand> {
  constructor(@InjectRepository(Brand) brandRepository: Repository<Brand>, eventEmitter: EventEmitter2) {
    super(brandRepository, BRAND_SEARCHABLE_FIELDS, eventEmitter);
  }
}
