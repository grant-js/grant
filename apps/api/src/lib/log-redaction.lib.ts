/**
 * Redaction for values that are logged whole (a request body, say). A body can carry a
 * password, a one-time code or a token; the log must not.
 */

const SENSITIVE_KEY = /pass(word)?|secret|token|code|hash|authorization|credential/i;
const MAX_DEPTH = 6;

export const REDACTED = '[redacted]';

/** A copy of `value` with the value of every sensitive-looking key replaced. Never mutates. */
export function redactSensitiveFields(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    return depth >= MAX_DEPTH
      ? REDACTED
      : value.map((item) => redactSensitiveFields(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    if (depth >= MAX_DEPTH) return REDACTED;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : redactSensitiveFields(entry, depth + 1),
      ])
    );
  }
  return value;
}
