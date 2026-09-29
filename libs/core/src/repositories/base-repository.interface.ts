import { ParsedListQuery } from '../common/interfaces/list-query.interface.js';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';

/**
 * TypeScript mirror of Modules/Core/app/Repositories/Interfaces/BaseRepositoryInterface.php.
 * A module can type its repository against a narrower interface that
 * extends this one, exactly like BrandRepositoryInterface extends
 * BaseRepositoryInterface in the Laravel reference.
 *
 * `relations` is a list of TypeORM relation property paths to eager-load
 * (e.g. `['category', 'category.parent']`) - the equivalent of Eloquent's
 * `with()`.
 */
export interface IBaseRepository<T> {
  findAll(query: ParsedListQuery, relations?: string[]): Promise<PaginatedResult<T> | T[]>;
  findById(id: string, relations?: string[]): Promise<T>;
  findOneBy(field: string, value: unknown, relations?: string[]): Promise<T>;
  updateOrCreate(match: Record<string, unknown>, data: Partial<T>): Promise<T>;
  firstOrCreate(match: Record<string, unknown>, data?: Partial<T>): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  save(entity: T, data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  insertMany(data: Partial<T>[]): Promise<boolean>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<number>;
  restore(id: string): Promise<T>;
  bulkRestore(ids: string[]): Promise<number>;
  get(id: string, relations?: string[]): Promise<T | null>;
  getBy(field: string, value: unknown, relations?: string[], multiple?: boolean): Promise<T | T[] | null>;
  bulkUpdate(conditions: Record<string, unknown>, data: Partial<T>): Promise<number>;
  sync(entity: T, field: string, ids: string[]): Promise<T>;
}
