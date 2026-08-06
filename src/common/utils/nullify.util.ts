/**
 * Recursively converts empty strings/arrays/objects and blank/whitespace
 * strings to `null`. Direct port of Modules/Core/app/Adapters/Nullify.php,
 * used to clean up API payloads before they're returned so consumers get a
 * real `null` instead of "".
 */
export function nullify<T = unknown>(value: T): T {
  if (value === null || value === undefined) {
    return null as unknown as T;
  }

  if (isBlank(value)) {
    return null as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => nullify(item)) as unknown as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(output)) {
      output[key] = nullify(output[key]);
    }
    return output as unknown as T;
  }

  return value;
}

function isBlank(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return false;
  }
  if (value instanceof Date) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length === 0;
  }
  return !value;
}
