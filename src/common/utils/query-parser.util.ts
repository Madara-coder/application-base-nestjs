import { COMPARISON_PREFIX_PATTERN } from '../constants/comparison-operators.const';
import { ParsedListQuery, FilterItem, CompareItem } from '../interfaces/searchable-model.interface';

const DEFAULT_PER_PAGE = 25;

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Normalizes an Express/Nest raw query object into a ParsedListQuery.
 *
 * Equivalent of Filterable::validateFiltering() + the reserved-key handling
 * in getFiltered(). Anything that isn't a reserved key AND matches
 * `__op_field` is bucketed into `compare` (see loadCompared() in the Laravel
 * trait); everything else is ignored rather than rejected, since query
 * strings routinely carry unrelated params (tracking, etc).
 *
 * @param query Raw `request.query` object.
 * @param defaultPerPage Falls back to this when neither `perPage` nor
 * `page`-size is supplied (mirrors `config('core.perPage')`).
 */
export function parseListQuery(
  query: Record<string, any> = {},
  defaultPerPage = DEFAULT_PER_PAGE,
): ParsedListQuery {
  const reservedKeys = new Set([
    'page',
    'perPage',
    'noPaginate',
    'sortBy',
    'sortOrder',
    'search',
    'filter',
    'withTrashed',
    'onlyTrashed',
  ]);

  const filter: FilterItem[] = Array.isArray(query.filter)
    ? query.filter
        .filter((item: any) => item && item.filterBy && item.value !== undefined)
        .map((item: any) => ({ filterBy: String(item.filterBy), value: String(item.value) }))
    : [];

  const compare: CompareItem[] = [];
  for (const key of Object.keys(query)) {
    if (reservedKeys.has(key) || !COMPARISON_PREFIX_PATTERN.test(key)) {
      continue;
    }
    const [prefix] = key.match(COMPARISON_PREFIX_PATTERN) ?? [];
    if (!prefix) continue;

    compare.push({
      field: key.slice(prefix.length),
      operator: prefix,
      value: query[key],
    });
  }

  return {
    page: toNumber(query.page, 1),
    perPage: toNumber(query.perPage, defaultPerPage),
    noPaginate: toBoolean(query.noPaginate),
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    search: typeof query.search === 'string' && query.search.length > 0 ? query.search : undefined,
    filter,
    compare,
    withTrashed: toBoolean(query.withTrashed),
    onlyTrashed: toBoolean(query.onlyTrashed),
  };
}
