/**
 * Character BaseRepository passes as `LIKE ... ESCAPE '!'`. `!` rather than
 * the usual backslash because a backslash inside a SQL string literal is
 * itself an escape on MySQL but not on Postgres, so `ESCAPE '\'` can't be
 * written portably - `ESCAPE '!'` means the same thing on every driver.
 */
export const LIKE_ESCAPE_CHAR = '!';

/**
 * Escapes LIKE wildcards (`%`, `_`) and the escape character itself before a
 * user-supplied string is dropped into a `LIKE` pattern. The value is always
 * sent as a bound parameter (so this isn't about SQL injection), but without
 * it `?search=%` would match every row and `_` would act as a single-char
 * wildcard.
 */
export function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, `${LIKE_ESCAPE_CHAR}$&`);
}
