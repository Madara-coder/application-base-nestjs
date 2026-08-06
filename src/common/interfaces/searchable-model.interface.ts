/**
 * Parsed & normalized version of everything a list endpoint's query string
 * can carry. Built by parseListQuery() (see common/utils/query-parser.util.ts).
 *
 * Equivalent of Filterable::validateFiltering() + the `__gte_x` extraction
 * done in Filterable::loadCompared() - both are folded into one parse step
 * here instead of being spread across several protected methods, since
 * there's no FormRequest-style pipeline to hook into at each stage.
 */
export interface FilterItem {
  filterBy: string;
  value: string;
}

export interface CompareItem {
  field: string;
  operator: string;
  value: unknown;
}

export interface ParsedListQuery {
  page: number;
  perPage: number;
  noPaginate: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  filter: FilterItem[];
  compare: CompareItem[];
  withTrashed: boolean;
  onlyTrashed: boolean;
}
