import { parseListQuery } from './query-parser.util.js';

describe('parseListQuery()', () => {
  it('applies defaults for an empty query', () => {
    expect(parseListQuery({})).toEqual({
      page: 1,
      perPage: 25,
      noPaginate: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: undefined,
      filter: [],
      compare: [],
      withTrashed: false,
      onlyTrashed: false,
    });
  });

  it('normalizes pagination, sort and boolean flags', () => {
    const parsed = parseListQuery({
      page: '3',
      perPage: '-5',
      sortBy: 'name',
      sortOrder: 'asc',
      noPaginate: '1',
      withTrashed: 'true',
    });

    expect(parsed).toMatchObject({
      page: 3,
      perPage: 25,
      sortBy: 'name',
      sortOrder: 'asc',
      noPaginate: true,
      withTrashed: true,
    });
  });

  it('extracts __op_field comparison params', () => {
    expect(parseListQuery({ __gte_price: '100', __like_name: 'matte', utm_source: 'x' }).compare).toEqual([
      { field: 'price', operator: '__gte_', value: '100' },
      { field: 'name', operator: '__like_', value: 'matte' },
    ]);
  });

  it('keeps only well-formed filter[] items', () => {
    const parsed = parseListQuery({ filter: [{ filterBy: 'slug', value: 'a' }, { filterBy: 'slug' }, null] });
    expect(parsed.filter).toEqual([{ filterBy: 'slug', value: 'a' }]);
  });
});
