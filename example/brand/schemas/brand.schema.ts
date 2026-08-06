import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from '@cosmetic/nestjs-core';

export type BrandDocument = HydratedDocument<Brand>;

/**
 * Mongo/Mongoose equivalent of Modules/Brand/app/Models/Brand.php.
 * `timestamps: true` gives createdAt/updatedAt (read by BaseResource's
 * withTimestamps()); `deletedAt` comes from BaseSchema and backs
 * BaseRepository's soft delete.
 */
@Schema({ timestamps: true })
export class Brand extends BaseSchema {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: String, ref: 'User' })
  createdBy?: string;

  @Prop({ type: String, ref: 'User' })
  updatedBy?: string;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

/** Fields `?search=` and `?filter[]=`/`__like_x` are allowed to match against. */
export const BRAND_SEARCHABLE_FIELDS = ['name', 'slug'];
