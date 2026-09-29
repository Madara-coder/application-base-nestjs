/**
 * Query-param prefix -> SQL comparison operator, e.g. `?__gte_price=100`
 * becomes `WHERE price >= 100`. Mirrors the `__gt_` / `__gte_` / ...
 * convention from the Laravel Core module's Filterable trait so API
 * consumers migrating from the Laravel API don't have to relearn filtering
 * syntax.
 */
export const COMPARISON_OPERATORS: Record<string, string> = {
  __gt_: '>',
  __gte_: '>=',
  __lt_: '<',
  __lte_: '<=',
  __eq_: '=',
  __neq_: '!=',
  __in_: 'IN',
  __nin_: 'NOT IN',
  __like_: 'LIKE',
  __nlike_: 'NOT LIKE',
};

export const COMPARISON_PREFIX_PATTERN = /^__[a-zA-Z]+_/;

export const SEARCH_LIKE_OPERATORS = new Set(['LIKE', 'NOT LIKE']);

export const LIST_OPERATORS = new Set(['IN', 'NOT IN']);
