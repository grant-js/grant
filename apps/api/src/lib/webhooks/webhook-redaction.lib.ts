import type { EventData } from '@grantjs/schema';

/**
 * Field names that must never leave the platform in a webhook payload. Matched
 * case-insensitively against object keys at any depth. Mirrors the sensitive
 * material excluded from audit/CDM exports (secrets, hashes, raw PII, tokens).
 */
const REDACTED_KEY_PATTERNS: RegExp[] = [
  /passwordhash/i,
  /password/i,
  /clientsecret/i,
  /secret/i,
  /accesskeysecret/i,
  /privatekey/i,
  /\btoken\b/i,
  /refreshtoken/i,
  /accesstoken/i,
  /apikey/i,
  /otp/i,
  /recoverycode/i,
  /mfa/i,
  /salt/i,
];

const REDACTED_PLACEHOLDER = '[redacted]';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRedactedKey(key: string): boolean {
  return REDACTED_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (isPlainObject(value)) {
    return redactObject(value);
  }
  return value;
}

function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = isRedactedKey(key) ? REDACTED_PLACEHOLDER : redactValue(value);
  }
  return output;
}

/**
 * Project internal event data to the external (webhook) shape: drops `before`
 * and applies the redaction allowlist to `after` and `delta`.
 */
export function redactEventData(data: EventData): EventData {
  const result: EventData = {};

  if (data.after) {
    result.after = redactObject(data.after);
  }

  if (data.delta) {
    const redactedDelta: Record<string, { from: unknown; to: unknown }> = {};
    for (const [field, change] of Object.entries(data.delta)) {
      if (isRedactedKey(field)) {
        redactedDelta[field] = { from: REDACTED_PLACEHOLDER, to: REDACTED_PLACEHOLDER };
      } else {
        redactedDelta[field] = {
          from: redactValue(change.from),
          to: redactValue(change.to),
        };
      }
    }
    result.delta = redactedDelta;
  }

  return result;
}
