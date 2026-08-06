import { ParsedListQuery } from '../common/interfaces/searchable-model.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

/**
 * TypeScript mirror of Modules/Core/app/Repositories/Interfaces/BaseRepositoryInterface.php.
 * A module can type its repository against a narrower interface that
 * extends this one, exactly like BrandRepositoryInterface extends
 * BaseRepositoryInterface in the Laravel reference.
 */
export interface IBaseRepository<T> {
  findAll(query: ParsedListQuery, populate?: string[]): Promise<PaginatedResult<T> | T[]>;
  findById(id: string, populate?: string[]): Promise<T>;
  findOneBy(field: string, value: unknown, populate?: string[]): Promise<T>;
  updateOrCreate(match: Record<string, unknown>, data: Partial<T>): Promise<T>;
  firstOrCreate(match: Record<string, unknown>, data?: Partial<T>): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  save(document: T, data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  insertMany(data: Partial<T>[]): Promise<boolean>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<number>;
  restore(id: string): Promise<T>;
  bulkRestore(ids: string[]): Promise<number>;
  get(id: string, populate?: string[]): Promise<T | null>;
  getBy(
    field: string,
    value: unknown,
    populate?: string[],
    multiple?: boolean,
  ): Promise<T | T[] | null>;
  bulkUpdate(conditions: Record<string, unknown>, data: Partial<T>): Promise<number>;
  sync(document: T, field: string, ids: string[]): Promise<T>;
}
