import {
  type DomainEvent,
  EVENT_IDENTITY_KEYS,
  type EventData,
  type EventIdentity,
  type ExternalEventData,
} from '@grantjs/schema';

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

/**
 * Identity keys that match a redaction pattern without being a credential:
 * `apiKeyId` is the id of an API key, not its secret (`/apikey/i` matches it).
 */
const IDENTITY_KEYS_EXEMPT_FROM_REDACTION: ReadonlySet<string> = new Set(['apiKeyId']);

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
 * Events about a person: the `user` aggregate and the `user.*` / `project.user_*`
 * types. A `name` on one of their snapshots could be a person's name, so it is not
 * carried; the id (and `grantsubjectuser`) identify the person.
 */
function isUserEvent(event: Pick<DomainEvent, 'type' | 'aggregate'>): boolean {
  return (
    event.aggregate?.kind === 'user' ||
    event.type.startsWith('user.') ||
    event.type.startsWith('project.user_')
  );
}

function isIdentityValue(value: unknown): value is string | number | boolean | null {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

/**
 * Reduce an internal `before` snapshot to the identity of what it describes: the
 * keys in `EVENT_IDENTITY_KEYS` whose value is a primitive. Everything else (email,
 * profile fields, metadata, timestamps, nested objects) is dropped, and a key that
 * matches a redaction pattern is replaced by the placeholder. Returns `undefined`
 * when nothing identifies the snapshot, so the envelope carries no empty `before`.
 * `dropName` also drops `name` (events about a person, see `isUserEvent`).
 */
export function projectIdentity(
  before: Record<string, unknown>,
  options: { dropName?: boolean } = {}
): EventIdentity | undefined {
  const identity: EventIdentity = {};
  for (const key of EVENT_IDENTITY_KEYS) {
    if (key === 'name' && options.dropName) {
      continue;
    }
    const value = before[key];
    if (!isIdentityValue(value)) {
      continue;
    }
    identity[key] =
      isRedactedKey(key) && !IDENTITY_KEYS_EXEMPT_FROM_REDACTION.has(key)
        ? REDACTED_PLACEHOLDER
        : value;
  }
  return Object.keys(identity).length > 0 ? identity : undefined;
}

/**
 * Project internal event data to the external (webhook) shape: `before` becomes an
 * identity-only projection (without `name` for events about a user), and the
 * redaction allowlist applies to `after` and `delta`. `event` supplies the type and
 * aggregate the projection depends on.
 */
export function redactEventData(
  data: EventData,
  event: Pick<DomainEvent, 'type' | 'aggregate'>
): ExternalEventData {
  const result: ExternalEventData = {};

  if (data.before) {
    const before = projectIdentity(data.before, { dropName: isUserEvent(event) });
    if (before) {
      result.before = before;
    }
  }

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
