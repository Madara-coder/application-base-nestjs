import { Column, DataSource, Entity } from 'typeorm';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CoreEntity } from '../database/core.entity.js';
import { BaseRepository } from './base.repository.js';
import { parseListQuery } from '../common/utils/query-parser.util.js';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface.js';
import { RecordNotFoundException } from '../common/exceptions/domain.exceptions.js';

@Entity('widgets')
class Widget extends CoreEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'int', default: 0 })
  rank: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

class WidgetRepository extends BaseRepository<Widget> {}

describe('BaseRepository', () => {
  let dataSource: DataSource;
  let repository: WidgetRepository;
  let emitted: string[];

  const list = async (query: Record<string, unknown>) =>
    (await repository.findAll(parseListQuery(query))) as PaginatedResult<Widget>;

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'sqljs', entities: [Widget], synchronize: true });
    await dataSource.initialize();

    emitted = [];
    const eventEmitter = { emit: (event: string) => emitted.push(event) } as unknown as EventEmitter2;
    repository = new WidgetRepository(dataSource.getRepository(Widget), ['name', 'slug', 'rank'], eventEmitter);

    await repository.create({ name: 'Matte Lipstick', slug: 'matte', rank: 1 });
    await repository.create({ name: 'Gloss', slug: 'gloss', rank: 3 });
    await repository.create({ name: '100% Pure', slug: 'pure_one', rank: 5 });
  });

  afterEach(() => dataSource.destroy());

  it('emits lifecycle events prefixed with the table name', () => {
    expect(emitted).toContain('widgets.store.before');
    expect(emitted).toContain('widgets.store.after');
  });

  describe('findAll()', () => {
    it('searches searchable fields case-insensitively', async () => {
      const result = await list({ search: 'MATTE' });
      expect(result.data.map((w) => w.slug)).toEqual(['matte']);
    });

    it.each(['%', '_'])('treats the LIKE wildcard %s in a search literally', async (wildcard) => {
      expect((await list({ search: wildcard })).meta.total).toBe(1);
    });

    it('applies filter[] and comparison operators', async () => {
      expect((await list({ filter: [{ filterBy: 'slug', value: 'glo' }] })).meta.total).toBe(1);
      expect((await list({ __gte_rank: '3' })).meta.total).toBe(2);
      expect((await list({ __in_slug: 'matte,gloss' })).meta.total).toBe(2);
      expect((await list({ __nlike_name: 'gloss' })).meta.total).toBe(2);
    });

    it('ignores filters on fields that are not searchable', async () => {
      expect((await list({ __eq_isActive: 'false' })).meta.total).toBe(3);
    });

    it('sorts, and falls back to createdAt for an unknown sortBy', async () => {
      const sorted = await list({ sortBy: 'rank', sortOrder: 'desc' });
      expect(sorted.data.map((w) => w.rank)).toEqual([5, 3, 1]);

      const fallback = await list({ sortBy: 'rank; DROP TABLE widgets' });
      expect(fallback.meta.total).toBe(3);
    });

    it('paginates', async () => {
      const page = await list({ perPage: '2', page: '2' });
      expect(page.data).toHaveLength(1);
      expect(page.meta).toEqual({ total: 3, perPage: 2, currentPage: 2, lastPage: 2 });
    });

    it('returns a plain array with noPaginate', async () => {
      const result = await repository.findAll(parseListQuery({ noPaginate: 'true' }));
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('soft delete', () => {
    it('hides deleted rows unless withTrashed/onlyTrashed is set, and restores them', async () => {
      const widget = await repository.findOneBy('slug', 'gloss');
      await repository.delete(widget.id);

      expect(await repository.get(widget.id)).toBeNull();
      expect((await list({})).meta.total).toBe(2);
      expect((await list({ withTrashed: 'true' })).meta.total).toBe(3);
      expect((await list({ onlyTrashed: 'true' })).data.map((w) => w.id)).toEqual([widget.id]);

      const restored = await repository.restore(widget.id);
      expect(restored.deletedAt).toBeNull();
    });

    it('throws RecordNotFoundException when deleting twice or restoring a live row', async () => {
      const widget = await repository.findOneBy('slug', 'gloss');
      await repository.delete(widget.id);

      await expect(repository.delete(widget.id)).rejects.toBeInstanceOf(RecordNotFoundException);
      await repository.restore(widget.id);
      await expect(repository.restore(widget.id)).rejects.toBeInstanceOf(RecordNotFoundException);
    });

    it('bulk deletes and restores', async () => {
      const widgets = (await repository.getBy('slug', ['matte', 'gloss'], [], true)) as Widget[];
      const ids = widgets.map((w) => w.id);

      expect(await repository.bulkDelete(ids)).toBe(2);
      expect(await repository.bulkRestore(ids)).toBe(2);
      expect(await repository.bulkDelete([])).toBe(0);
    });
  });

  describe('writes', () => {
    it('updates an existing row and 404s on an unknown id', async () => {
      const widget = await repository.findOneBy('slug', 'matte');
      const updated = await repository.update(widget.id, { rank: 9 });

      expect(updated).toMatchObject({ rank: 9, name: 'Matte Lipstick' });
      await expect(repository.update('00000000-0000-0000-0000-000000000000', { rank: 1 })).rejects.toBeInstanceOf(
        RecordNotFoundException,
      );
    });

    it('updateOrCreate / firstOrCreate reuse a match or create a new row', async () => {
      expect((await repository.updateOrCreate({ slug: 'gloss' }, { name: 'Gloss 2' })).name).toBe('Gloss 2');
      expect((await repository.firstOrCreate({ slug: 'new' }, { name: 'New' })).id).toBeDefined();
      expect((await list({})).meta.total).toBe(4);
    });

    it('bulk inserts and bulk updates', async () => {
      await repository.insertMany([
        { name: 'X', slug: 'x' },
        { name: 'Y', slug: 'y' },
      ]);
      expect(await repository.bulkUpdate({ isActive: true }, { isActive: false })).toBe(5);
    });
  });
});
