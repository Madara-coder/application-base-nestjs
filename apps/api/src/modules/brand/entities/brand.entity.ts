import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';
import { CoreEntity } from '@app/core';

/**
 * TypeORM equivalent of Modules/Brand/app/Models/Brand.php.
 * `id`, `createdAt`/`updatedAt` (read by BaseResource's withTimestamps()) and
 * `deletedAt` (backs BaseRepository's soft delete) all come from CoreEntity.
 * The table name doubles as the event prefix ("brands.store.after").
 */
@Entity('brands')
export class Brand extends CoreEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy?: string | null;

  /** Normalizes on every save() - BaseRepository#create()/update() both go through save(). */
  @BeforeInsert()
  @BeforeUpdate()
  normalize(): void {
    this.name = this.name?.trim();
    this.slug = this.slug?.trim().toLowerCase();
  }
}

/** Fields `?search=` and `?filter[]=`/`__like_x` are allowed to match against. */
export const BRAND_SEARCHABLE_FIELDS = ['name', 'slug'];
