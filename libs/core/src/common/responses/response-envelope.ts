/**
 * The `{ message?, data? }` body every endpoint returns. A class (not just an
 * object shape) so TransformResponseInterceptor can tell an envelope that's
 * already built - BaseController#success() - from handler data that merely
 * happens to have `data`/`message` keys, like a PaginatedResult.
 */
export class ResponseEnvelope {
  message?: string;
  data?: unknown;

  constructor(message?: string | null, data?: unknown) {
    // Omit `message` when falsy and `data` when null/empty, so list/delete
    // endpoints don't return noisy keys (mirrors ApiResponse::response()).
    if (message) this.message = message;

    const isEmpty = data === null || data === undefined || (Array.isArray(data) && data.length === 0);
    if (!isEmpty) this.data = data;
  }
}
