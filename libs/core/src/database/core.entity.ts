import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Every module entity should extend this instead of a bare class, and
 * declare its own `@Entity('table_name')` (the table name also becomes the
 * event prefix BaseRepository emits under, e.g. "brands.store.after").
 *
 * `deletedAt` is a TypeORM @DeleteDateColumn, so soft delete is native:
 * plain find()/findOne() calls skip soft-deleted rows automatically, and
 * BaseRepository's delete()/restore()/bulkRestore() + the
 * withTrashed/onlyTrashed query flags build on top of it - equivalent of
 * Laravel's SoftDeletes trait.
 *
 * Named CoreEntity rather than BaseEntity to avoid clashing with TypeORM's
 * own (Active Record) BaseEntity export.
 */
export abstract class CoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}

/**
 * Concrete entities declare which fields `?search=` and `?filter[]=` are
 * allowed to match against. Equivalent of HasSearchable::searchable()/
 * SEARCHABLE on the Laravel BaseModel - kept as a plain static array here
 * rather than a decorator so BaseRepository can read it with zero magic.
 */
export interface Searchable {
  searchableFields: string[];
}
