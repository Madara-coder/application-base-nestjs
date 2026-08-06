import { Prop, Schema } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Every module schema should extend this instead of a bare class, and
 * declare it with `@Schema({ timestamps: true })` (timestamps are declared
 * per-class by @nestjs/mongoose, not inherited, so it's repeated on the
 * concrete schema - see example/brand/schemas/brand.schema.ts).
 *
 * `deletedAt` backs the soft-delete behaviour BaseRepository implements
 * (delete()/restore()/bulkRestore() + the withTrashed/onlyTrashed query
 * flags) - equivalent of Laravel's SoftDeletes trait, since Mongoose has no
 * built-in soft-delete concept.
 */
@Schema()
export abstract class BaseSchema {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;
}

export type BaseDocument = BaseSchema & Document<Types.ObjectId>;

/**
 * Concrete schemas declare which fields `?search=` and `?filter[]=` are
 * allowed to match against. Equivalent of HasSearchable::searchable()/
 * SEARCHABLE on the Laravel BaseModel - kept as a plain static array here
 * rather than a decorator so BaseRepository can read it with zero magic.
 */
export interface Searchable {
  searchableFields: string[];
}
