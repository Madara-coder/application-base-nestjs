import { PartialType } from '@nestjs/swagger';
import { CreateBrandDto } from './create-brand.dto.js';

/**
 * Every field from CreateBrandDto, but optional - the Nest-idiomatic
 * replacement for BrandRequest::update() defaulting to store()'s rules.
 * Override individual fields here when update rules genuinely differ
 * (e.g. a unique-except-self check), same as the Laravel version did with
 * `Rule::unique(...)->ignore($brandId)`.
 */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
