import { Brackets, DeepPartial, FindOptionsWhere, In, IsNull, Not, SelectQueryBuilder } from 'typeorm';
import type { FindOptionsRelations, ObjectLiteral, QueryDeepPartialEntity, Repository } from 'typeorm';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { IBaseRepository } from './base-repository.interface.js';
import { ParsedListQuery } from '../common/interfaces/list-query.interface.js';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';
import {
  COMPARISON_OPERATORS,
  LIST_OPERATORS,
  SEARCH_LIKE_OPERATORS,
} from '../common/constants/comparison-operators.const.js';
import { escapeLike, LIKE_ESCAPE_CHAR } from '../common/utils/like.util.js';
import { RecordNotFoundException } from '../common/exceptions/domain.exceptions.js';

const DEFAULT_SORT_BY = 'createdAt';

/**
 * Every module repository should extend this and call
 * `super(repository, searchableFields, eventEmitter)` from its own
 * constructor, passing the TypeORM `Repository<Entity>` injected with
 * `@InjectRepository(Entity)`. Gets full CRUD + filtering/search/sort/
 * pagination + soft delete + lifecycle events, same contract as
 * Modules/Core/app/Repositories/BaseRepository.php.
 *
 * Assumes the entity extends CoreEntity (uuid `id` primary key +
 * `deletedAt` @DeleteDateColumn).
 *
 * No query-result caching here on purpose, same reasoning as the Laravel
 * version: add it per-repository, only where profiling shows it's worth the
 * invalidation risk - a generic base class is the wrong place to guess at
 * cache keys/TTLs for every module.
 */
export abstract class BaseRepository<T extends ObjectLiteral> implements IBaseRepository<T> {
  protected readonly modelName: string;
  protected readonly eventPrefix: string;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly searchableFields: string[] = [],
    protected readonly eventEmitter?: EventEmitter2,
  ) {
    this.modelName = repository.metadata.name;
    this.eventPrefix = repository.metadata.tableName;
  }

  /**
   * Dispatches `"{table}.{eventKey}"`, e.g. "brands.store.after".
   * Equivalent of HasEvent::eventDispatch(). No-op if no EventEmitter2 was
   * injected, so a repository can be used standalone in tests without
   * wiring up @nestjs/event-emitter.
   */
  protected emit(eventKey: string, payload: unknown = {}): void {
    this.eventEmitter?.emit(`${this.eventPrefix}.${eventKey}`, payload);
  }

  /** `{ id }` typed as a where clause for the generic entity. */
  protected byId(id: string): FindOptionsWhere<T> {
    return { id } as unknown as FindOptionsWhere<T>;
  }

  /**
   * `['category', 'category.parent']` -> `{ category: { parent: true } }`,
   * the object form TypeORM's find*() options take for `relations`.
   */
  protected toRelations(paths: string[]): FindOptionsRelations<T> {
    const relations: Record<string, unknown> = {};
    for (const path of paths) {
      let node = relations;
      const segments = path.split('.');
      segments.forEach((segment, index) => {
        if (index === segments.length - 1) {
          node[segment] ??= true;
        } else {
          if (typeof node[segment] !== 'object') node[segment] = {};
          node = node[segment] as Record<string, unknown>;
        }
      });
    }
    return relations as FindOptionsRelations<T>;
  }

  /**
   * Builds the list query: soft-delete scope, `?search=` across
   * searchableFields, `filter[]`, and `__gte_x`-style comparisons. Field
   * names only ever come from the developer-declared searchableFields
   * allow-list; user values are always bound parameters.
   */
  protected buildListQuery(query: ParsedListQuery, relations: string[]): SelectQueryBuilder<T> {
    const alias = this.eventPrefix;
    const qb = this.repository.createQueryBuilder(alias);
    const column = (field: string) => `${alias}.${field}`;
    let paramIndex = 0;
    const param = () => `p${paramIndex++}`;
    const likeClause = (field: string, value: string, negate = false) => {
      const name = param();
      return {
        sql: `LOWER(${column(field)}) ${negate ? 'NOT LIKE' : 'LIKE'} LOWER(:${name}) ESCAPE '${LIKE_ESCAPE_CHAR}'`,
        params: { [name]: `%${escapeLike(value)}%` },
      };
    };

    this.joinRelations(qb, relations);

    if (query.onlyTrashed) {
      qb.withDeleted().andWhere(`${column('deletedAt')} IS NOT NULL`);
    } else if (query.withTrashed) {
      qb.withDeleted();
    }

    if (query.search && this.searchableFields.length > 0) {
      const search = query.search;
      qb.andWhere(
        new Brackets((sub) => {
          for (const field of this.searchableFields) {
            const { sql, params } = likeClause(field, search);
            sub.orWhere(sql, params);
          }
        }),
      );
    }

    for (const item of query.filter) {
      if (!this.searchableFields.includes(item.filterBy)) continue;
      const { sql, params } = likeClause(item.filterBy, item.value);
      qb.andWhere(sql, params);
    }

    for (const item of query.compare) {
      if (!this.searchableFields.includes(item.field)) continue;
      const operator = COMPARISON_OPERATORS[item.operator];
      if (!operator) continue;

      if (SEARCH_LIKE_OPERATORS.has(operator)) {
        const { sql, params } = likeClause(item.field, String(item.value), operator === 'NOT LIKE');
        qb.andWhere(sql, params);
      } else if (LIST_OPERATORS.has(operator)) {
        // `?__in_status=a,b` or `?__in_status[]=a&__in_status[]=b`
        const values = Array.isArray(item.value) ? item.value : String(item.value).split(',');
        if (values.length === 0) continue;
        const name = param();
        qb.andWhere(`${column(item.field)} ${operator} (:...${name})`, { [name]: values });
      } else {
        const name = param();
        qb.andWhere(`${column(item.field)} ${operator} :${name}`, { [name]: item.value });
      }
    }

    // sortBy is user input and ends up in ORDER BY, which can't be a bound
    // parameter - only accept it if it's a real column on the entity.
    const sortBy = this.repository.metadata.findColumnWithPropertyPath(query.sortBy) ? query.sortBy : DEFAULT_SORT_BY;
    qb.orderBy(column(sortBy), query.sortOrder === 'asc' ? 'ASC' : 'DESC');

    return qb;
  }

  /** leftJoinAndSelect()s each relation path, including nested ones like `category.parent`. */
  protected joinRelations(qb: SelectQueryBuilder<T>, relations: string[]): void {
    const joined = new Set<string>();
    for (const path of relations) {
      let parentAlias = qb.alias;
      for (const segment of path.split('.')) {
        const alias = `${parentAlias}__${segment}`;
        if (!joined.has(alias)) {
          qb.leftJoinAndSelect(`${parentAlias}.${segment}`, alias);
          joined.add(alias);
        }
        parentAlias = alias;
      }
    }
  }

  async findAll(query: ParsedListQuery, relations: string[] = []): Promise<PaginatedResult<T> | T[]> {
    this.emit('fetch-all.before', { query, relations });

    const qb = this.buildListQuery(query, relations);

    let result: PaginatedResult<T> | T[];
    if (query.noPaginate) {
      result = await qb.getMany();
    } else {
      const [data, total] = await qb
        .skip((query.page - 1) * query.perPage)
        .take(query.perPage)
        .getManyAndCount();

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

  async findById(id: string, relations: string[] = []): Promise<T> {
    this.emit('fetch-single.before', { id, relations });

    const found = await this.repository.findOne({ where: this.byId(id), relations: this.toRelations(relations) });
    if (!found) throw new RecordNotFoundException(this.modelName);

    this.emit('fetch-single.after', found);
    return found;
  }

  async findOneBy(field: string, value: unknown, relations: string[] = []): Promise<T> {
    this.emit('fetch-by-column-single.before', { field, value, relations });

    const found = await this.repository.findOne({
      where: { [field]: value } as FindOptionsWhere<T>,
      relations: this.toRelations(relations),
    });
    if (!found) throw new RecordNotFoundException(this.modelName);

    this.emit('fetch-by-column-single.after', found);
    return found;
  }

  /**
   * Matches soft-deleted rows too (like Eloquent's updateOrCreate on a
   * model without the SoftDeletes scope applied), so a unique column on a
   * trashed row updates it instead of failing with a duplicate-key error.
   */
  async updateOrCreate(match: Record<string, unknown>, data: Partial<T>): Promise<T> {
    this.emit('update-or-store.before', { match, data });

    const existing = await this.repository.findOne({
      where: match as FindOptionsWhere<T>,
      withDeleted: true,
    });
    const entity = existing
      ? this.repository.merge(existing, data as DeepPartial<T>)
      : this.repository.create({ ...match, ...data } as DeepPartial<T>);
    const saved = await this.repository.save(entity);

    this.emit('update-or-store.after', saved);
    return saved;
  }

  async firstOrCreate(match: Record<string, unknown>, data: Partial<T> = {}): Promise<T> {
    this.emit('fetch-or-store.before', { match, data });

    let entity = await this.repository.findOne({
      where: match as FindOptionsWhere<T>,
      withDeleted: true,
    });
    if (!entity) {
      entity = await this.repository.save(this.repository.create({ ...match, ...data } as DeepPartial<T>));
    }

    this.emit('fetch-or-store.after', entity);
    return entity;
  }

  async create(data: Partial<T>): Promise<T> {
    this.emit('store.before', { data });

    const created = await this.repository.save(this.repository.create(data as DeepPartial<T>));

    this.emit('store.after', created);
    return created;
  }

  async save(entity: T, data: Partial<T>): Promise<T> {
    this.emit('save.before', { [this.modelName]: entity, data });

    const saved = await this.repository.save(this.repository.merge(entity, data as DeepPartial<T>));

    this.emit('save.after', saved);
    return saved;
  }

  /**
   * Load + merge + save rather than a bare UPDATE query, so entity
   * listeners/subscribers (@BeforeUpdate etc.) run and the full updated
   * entity comes back without a second round-trip.
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    this.emit('update.before', { id, data });

    const existing = await this.repository.findOne({ where: this.byId(id) });
    if (!existing) throw new RecordNotFoundException(this.modelName);
    const updated = await this.repository.save(this.repository.merge(existing, data as DeepPartial<T>));

    this.emit('update.after', updated);
    return updated;
  }

  async insertMany(data: Partial<T>[]): Promise<boolean> {
    this.emit('insert.before', { data });

    if (data.length > 0) {
      await this.repository.insert(data as QueryDeepPartialEntity<T>[]);
    }

    this.emit('insert.after', data);
    return true;
  }

  async delete(id: string): Promise<void> {
    this.emit('delete.before', { id });

    const result = await this.repository.softDelete({
      ...this.byId(id),
      deletedAt: IsNull(),
    } as FindOptionsWhere<T>);
    if (!result.affected) throw new RecordNotFoundException(this.modelName);

    this.emit('delete.after', { id });
  }

  async bulkDelete(ids: string[]): Promise<number> {
    this.emit('bulk-delete.before', { ids });

    let deleteCount = 0;
    if (ids.length > 0) {
      const result = await this.repository.softDelete({
        id: In(ids),
        deletedAt: IsNull(),
      } as unknown as FindOptionsWhere<T>);
      deleteCount = result.affected ?? 0;
    }

    this.emit('bulk-delete.after', { ids, deleteCount });
    return deleteCount;
  }

  async restore(id: string): Promise<T> {
    this.emit('restore.before', { id });

    const result = await this.repository.restore({
      ...this.byId(id),
      deletedAt: Not(IsNull()),
    } as FindOptionsWhere<T>);
    if (!result.affected) throw new RecordNotFoundException(this.modelName);
    const restored = await this.repository.findOneOrFail({ where: this.byId(id) });

    this.emit('restore.after', restored);
    return restored;
  }

  async bulkRestore(ids: string[]): Promise<number> {
    this.emit('bulk-restore.before', { ids });

    let restoreCount = 0;
    if (ids.length > 0) {
      const result = await this.repository.restore({
        id: In(ids),
        deletedAt: Not(IsNull()),
      } as unknown as FindOptionsWhere<T>);
      restoreCount = result.affected ?? 0;
    }

    this.emit('bulk-restore.after', { ids, restoreCount });
    return restoreCount;
  }

  async get(id: string, relations: string[] = []): Promise<T | null> {
    this.emit('get-single.before', { id, relations });

    const found = await this.repository.findOne({ where: this.byId(id), relations: this.toRelations(relations) });

    this.emit('get-single.after', found);
    return found;
  }

  async getBy(field: string, value: unknown, relations: string[] = [], multiple = false): Promise<T | T[] | null> {
    this.emit('get-by-column-single.before', { field, value, relations });

    const where = { [field]: Array.isArray(value) ? In(value) : value } as FindOptionsWhere<T>;
    const findOptions = { where, relations: this.toRelations(relations) };
    const fetched = multiple ? await this.repository.find(findOptions) : await this.repository.findOne(findOptions);

    this.emit('get-by-column-single.after', fetched);
    return fetched;
  }

  async bulkUpdate(conditions: Record<string, unknown>, data: Partial<T>): Promise<number> {
    this.emit('bulk-update.before', { conditions, data });

    const result = await this.repository.update(conditions as FindOptionsWhere<T>, data as QueryDeepPartialEntity<T>);
    const updatedCount = result.affected ?? 0;

    this.emit('bulk-update.after', updatedCount);
    return updatedCount;
  }

  /**
   * Replaces a many-to-many relation's members, e.g. syncing tag ids onto a
   * product - direct equivalent of Eloquent's pivot-table sync(). TypeORM
   * diffs the join table on save(), inserting/removing only what changed.
   * Assumes the related entity's primary key is `id` (true for CoreEntity).
   * No event dispatch, matching the Laravel version.
   */
  async sync(entity: T, field: string, ids: string[]): Promise<T> {
    (entity as Record<string, unknown>)[field] = Array.from(new Set(ids)).map((id) => ({ id }));
    return this.repository.save(entity);
  }
}
