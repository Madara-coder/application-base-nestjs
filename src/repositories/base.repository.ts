import { FilterQuery, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IBaseRepository } from './base-repository.interface';
import { ParsedListQuery } from '../common/interfaces/searchable-model.interface';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { COMPARISON_OPERATORS } from '../common/constants/comparison-operators.const';
import { escapeRegex } from '../common/utils/regex.util';
import { RecordNotFoundException } from '../common/exceptions/domain.exceptions';

/**
 * Every module repository should extend this and call
 * `super(model, searchableFields, eventEmitter)` from its own constructor.
 * Gets full CRUD + filtering/search/sort/pagination + soft delete +
 * lifecycle events, same contract as Modules/Core/app/Repositories/BaseRepository.php.
 *
 * No query-result caching here on purpose, same reasoning as the Laravel
 * version: add it per-repository, only where profiling shows it's worth the
 * invalidation risk - a generic base class is the wrong place to guess at
 * cache keys/TTLs for every module.
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected readonly modelName: string;
  protected readonly eventPrefix: string;

  constructor(
    protected readonly model: Model<any>,
    protected readonly searchableFields: string[] = [],
    protected readonly eventEmitter?: EventEmitter2,
  ) {
    this.modelName = model.modelName;
    this.eventPrefix = model.collection.collectionName;
  }

  /**
   * Dispatches `"{collection}.{eventKey}"`, e.g. "brands.store.after".
   * Equivalent of HasEvent::eventDispatch(). No-op if no EventEmitter2 was
   * injected, so a repository can be used standalone in tests without
   * wiring up @nestjs/event-emitter.
   */
  protected emit(eventKey: string, payload: unknown = {}): void {
    this.eventEmitter?.emit(`${this.eventPrefix}.${eventKey}`, payload);
  }

  private buildFilter(query: ParsedListQuery): FilterQuery<any> {
    const filter: FilterQuery<any> = {};

    if (query.onlyTrashed) {
      filter.deletedAt = { $ne: null };
    } else if (!query.withTrashed) {
      filter.deletedAt = null;
    }

    const andConditions: FilterQuery<any>[] = [];

    if (query.search && this.searchableFields.length > 0) {
      andConditions.push({
        $or: this.searchableFields.map((field) => ({
          [field]: { $regex: escapeRegex(query.search as string), $options: 'i' },
        })),
      });
    }

    for (const item of query.filter) {
      if (!this.searchableFields.includes(item.filterBy)) continue;
      andConditions.push({ [item.filterBy]: { $regex: escapeRegex(item.value), $options: 'i' } });
    }

    for (const item of query.compare) {
      if (!this.searchableFields.includes(item.field)) continue;
      const operator = COMPARISON_OPERATORS[item.operator];
      if (!operator) continue;

      if (operator === '$regex') {
        andConditions.push({ [item.field]: { $regex: escapeRegex(String(item.value)), $options: 'i' } });
      } else if (operator === '$not') {
        andConditions.push({
          [item.field]: { $not: { $regex: escapeRegex(String(item.value)), $options: 'i' } },
        });
      } else {
        andConditions.push({ [item.field]: { [operator]: item.value } });
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    return filter;
  }

  async findAll(query: ParsedListQuery, populate: string[] = []): Promise<PaginatedResult<T> | T[]> {
    this.emit('fetch-all.before', { query, populate });

    const filter = this.buildFilter(query);
    let mongoQuery = this.model
      .find(filter)
      .sort({ [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 });
    if (populate.length) mongoQuery = mongoQuery.populate(populate);

    let result: PaginatedResult<T> | T[];
    if (query.noPaginate) {
      result = (await mongoQuery.exec()) as unknown as T[];
    } else {
      const total = await this.model.countDocuments(filter);
      const data = (await mongoQuery
        .skip((query.page - 1) * query.perPage)
        .limit(query.perPage)
        .exec()) as unknown as T[];

      result = {
        data,
        meta: {
          total,
          perPage: query.perPage,
          currentPage: query.page,
          lastPage: Math.max(1, Math.ceil(total / query.perPage)),
        },
      };
    }

    this.emit('fetch-all.after', result);
    return result;
  }

  async findById(id: string, populate: string[] = []): Promise<T> {
    this.emit('fetch-single.before', { id, populate });

    let mongoQuery = this.model.findOne({ _id: id, deletedAt: null });
    if (populate.length) mongoQuery = mongoQuery.populate(populate);
    const found = await mongoQuery.exec();
    if (!found) throw new RecordNotFoundException(this.modelName);

    this.emit('fetch-single.after', found);
    return found as unknown as T;
  }

  async findOneBy(field: string, value: unknown, populate: string[] = []): Promise<T> {
    this.emit('fetch-by-column-single.before', { field, value, populate });

    let mongoQuery = this.model.findOne({ [field]: value, deletedAt: null });
    if (populate.length) mongoQuery = mongoQuery.populate(populate);
    const found = await mongoQuery.exec();
    if (!found) throw new RecordNotFoundException(this.modelName);

    this.emit('fetch-by-column-single.after', found);
    return found as unknown as T;
  }

  async updateOrCreate(match: Record<string, unknown>, data: Partial<T>): Promise<T> {
    this.emit('update-or-store.before', { match, data });

    const updated = await this.model.findOneAndUpdate(
      match,
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    this.emit('update-or-store.after', updated);
    return updated as unknown as T;
  }

  async firstOrCreate(match: Record<string, unknown>, data: Partial<T> = {}): Promise<T> {
    this.emit('fetch-or-store.before', { match, data });

    let doc = await this.model.findOne(match);
    if (!doc) {
      doc = await this.model.create({ ...match, ...data });
    }

    this.emit('fetch-or-store.after', doc);
    return doc as unknown as T;
  }

  async create(data: Partial<T>): Promise<T> {
    this.emit('store.before', { data });

    const created = await this.model.create(data as Record<string, unknown>);

    this.emit('store.after', created);
    return created as unknown as T;
  }

  async save(document: T, data: Partial<T>): Promise<T> {
    this.emit('save.before', { [this.modelName]: document, data });

    Object.assign(document as Record<string, unknown>, data);
    await (document as any).save();

    this.emit('save.after', document);
    return document;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    this.emit('update.before', { id, data });

    const updated = await this.model.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: data },
      { new: true },
    );
    if (!updated) throw new RecordNotFoundException(this.modelName);

    this.emit('update.after', updated);
    return updated as unknown as T;
  }

  async insertMany(data: Partial<T>[]): Promise<boolean> {
    this.emit('insert.before', { data });

    await this.model.insertMany(data as Record<string, unknown>[]);

    this.emit('insert.after', data);
    return true;
  }

  async delete(id: string): Promise<void> {
    this.emit('delete.before', { id });

    const deleted = await this.model.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    if (!deleted) throw new RecordNotFoundException(this.modelName);

    this.emit('delete.after', { id });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    this.emit('bulk-delete.before', { ids });

    const result = await this.model.updateMany(
      { _id: { $in: ids }, deletedAt: null },
      { $set: { deletedAt: new Date() } },
    );
    const deleteCount = result.modifiedCount ?? 0;

    this.emit('bulk-delete.after', { ids, deleteCount });
    return deleteCount;
  }

  async restore(id: string): Promise<T> {
    this.emit('restore.before', { id });

    const restored = await this.model.findOneAndUpdate(
      { _id: id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true },
    );
    if (!restored) throw new RecordNotFoundException(this.modelName);

    this.emit('restore.after', restored);
    return restored as unknown as T;
  }

  async bulkRestore(ids: string[]): Promise<number> {
    this.emit('bulk-restore.before', { ids });

    const result = await this.model.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    const restoreCount = result.modifiedCount ?? 0;

    this.emit('bulk-restore.after', { ids, restoreCount });
    return restoreCount;
  }

  async get(id: string, populate: string[] = []): Promise<T | null> {
    this.emit('get-single.before', { id, populate });

    let mongoQuery = this.model.findOne({ _id: id, deletedAt: null });
    if (populate.length) mongoQuery = mongoQuery.populate(populate);
    const found = await mongoQuery.exec();

    this.emit('get-single.after', found);
    return found as unknown as T | null;
  }

  async getBy(
    field: string,
    value: unknown,
    populate: string[] = [],
    multiple = false,
  ): Promise<T | T[] | null> {
    this.emit('get-by-column-single.before', { field, value, populate });

    const condition = Array.isArray(value)
      ? { [field]: { $in: value }, deletedAt: null }
      : { [field]: value, deletedAt: null };

    let fetched: T | T[] | null;
    if (multiple) {
      let mongoQuery = this.model.find(condition);
      if (populate.length) mongoQuery = mongoQuery.populate(populate);
      fetched = (await mongoQuery.exec()) as unknown as T[];
    } else {
      let mongoQuery = this.model.findOne(condition);
      if (populate.length) mongoQuery = mongoQuery.populate(populate);
      fetched = (await mongoQuery.exec()) as unknown as T | null;
    }

    this.emit('get-by-column-single.after', fetched);
    return fetched;
  }

  async bulkUpdate(conditions: Record<string, unknown>, data: Partial<T>): Promise<number> {
    this.emit('bulk-update.before', { conditions, data });

    const result = await this.model.updateMany(conditions, { $set: data });
    const updatedCount = result.modifiedCount ?? 0;

    this.emit('bulk-update.after', updatedCount);
    return updatedCount;
  }

  /**
   * Sets an array-of-refs field on a document, e.g. syncing tag ids onto a
   * product. Closest Mongo analogue to Eloquent's pivot-table sync() - no
   * event dispatch, matching the Laravel version's own comment that this
   * doesn't require one.
   */
  async sync(document: T, field: string, ids: string[]): Promise<T> {
    (document as Record<string, unknown>)[field] = Array.from(new Set(ids));
    await (document as any).save();
    return document;
  }
}
