/**
 * Escapes regex metacharacters before a user-supplied string is dropped into
 * a Mongo `$regex` filter. Laravel's whereLikeAny() is safe from injection
 * because it goes through query bindings - Mongo's $regex takes a literal
 * pattern string, so this step is what keeps `?search=` from doubling as a
 * regex-injection / ReDoS vector.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
