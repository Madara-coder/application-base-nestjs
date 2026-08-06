/**
 * Query-param prefix -> Mongo query operator, e.g. `?__gte_price=100` becomes
 * `{ price: { $gte: 100 } }`. Mirrors the `__gt_` / `__gte_` / ... convention
 * from the Laravel Core module's Filterable trait so API consumers migrating
 * from the Laravel API don't have to relearn filtering syntax.
 */
export const COMPARISON_OPERATORS: Record<string, string> = {
  __gt_: '$gt',
  __gte_: '$gte',
  __lt_: '$lt',
  __lte_: '$lte',
  __eq_: '$eq',
  __neq_: '$ne',
  __in_: '$in',
  __nin_: '$nin',
  __like_: '$regex',
  __nlike_: '$not',
};

export const COMPARISON_PREFIX_PATTERN = /^__[a-zA-Z]+_/;

export const SEARCH_LIKE_OPERATORS = new Set(['$regex', '$not']);
