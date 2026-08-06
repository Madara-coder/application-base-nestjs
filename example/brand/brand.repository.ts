import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseRepository } from '@cosmetic/nestjs-core';
import { Brand, BrandDocument, BRAND_SEARCHABLE_FIELDS } from './schemas/brand.schema';

/**
 * Equivalent of Modules/Brand/app/Repositories/BrandRepository.php. No CRUD
 * method needs overriding here - everything comes from BaseRepository.
 * Add brand-specific query methods (e.g. `findActive()`) directly on this
 * class when a plain findAll()/findOneBy() isn't enough.
 */
@Injectable()
export class BrandRepository extends BaseRepository<BrandDocument> {
  constructor(@InjectModel(Brand.name) brandModel: Model<BrandDocument>, eventEmitter: EventEmitter2) {
    super(brandModel, BRAND_SEARCHABLE_FIELDS, eventEmitter);
  }
}
