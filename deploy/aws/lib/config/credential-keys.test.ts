/**
 * Every credential-shaped key in `@grantjs/env` must have a decision recorded.
 *
 * `classifyConfig` refuses a hard-coded list (gate 4, finding F-C). A hard-coded list
 * is exactly the thing that rots: `@grantjs/env` has 224 keys today and grows, and a
 * new `*_API_KEY` added there would silently start flowing into the CloudFormation
 * template as plaintext. Nothing would fail.
 *
 * So this is an oracle rather than a unit test, in the same shape as slice 1's routing
 * parity check. It reads the schema as **text** — `deploy/aws` declares no workspace
 * dependency and must not gain one for a test — applies a deliberately over-broad
 * heuristic, and requires every hit to be classified somewhere. A new credential key
 * fails this test with the key named, which is the moment to decide where it belongs.
 *
 * The heuristic over-matches on purpose. `AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES` is
 * a duration and `WEBHOOKS_SECRET_BYTES` is a length; both are listed below as
 * deliberate non-credentials. Being forced to write that down is the point — a
 * narrower pattern would let a real credential through by looking tidy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CREDENTIAL_KEYS,
  RESOLVER_SECRET_KEYS,
  STACK_COMPOSED_KEYS,
  STACK_GENERATED_KEYS,
} from './env-file';

const SCHEMA = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../packages/@grantjs/env/src/schema.ts'
);

/** Over-broad on purpose; the exclusions below are the recorded decisions. */
const CREDENTIAL_SHAPED = /(SECRET|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_KEY|CREDENTIAL)/;

/**
 * Matches the heuristic but is not a credential. Each needs a reason, because the
 * next person to read this has to be able to check the claim.
 */
const NOT_A_CREDENTIAL: Record<string, string> = {
  AUTH_PASSWORD_RESET_OTP_VALIDITY_MINUTES: 'a duration in minutes',
  SECRETS_AWS_ENDPOINT: 'resolver configuration — an endpoint URL',
  SECRETS_AWS_REGION: 'resolver configuration — a region name',
  SECRETS_AWS_SECRET_ID: 'names *where* to look; the stack sets it and it grants nothing',
  SECRETS_CACHE_TTL_SECONDS: 'a duration in seconds',
  SECRETS_PROVIDER: 'selects an implementation',
  WEBHOOKS_SECRET_BYTES: 'a length, used when generating a signing secret',
};

function schemaKeys(): string[] {
  const source = readFileSync(SCHEMA, 'utf-8');
  const keys = [...source.matchAll(/^ {2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]!);
  // Guards against a vacuous pass if the schema's shape ever changes: an empty or
  // tiny key list would make every assertion below trivially true.
  expect(keys.length).toBeGreaterThan(150);
  return [...new Set(keys)];
}

describe('every credential-shaped env key is classified', () => {
  it('leaves none unaccounted for', () => {
    const classified = new Set<string>([
      ...CREDENTIAL_KEYS,
      ...RESOLVER_SECRET_KEYS,
      ...STACK_COMPOSED_KEYS,
      ...STACK_GENERATED_KEYS,
      ...Object.keys(NOT_A_CREDENTIAL),
    ]);

    const unclassified = schemaKeys().filter(
      (key) => CREDENTIAL_SHAPED.test(key) && !classified.has(key)
    );

    expect(
      unclassified,
      `Credential-shaped keys with no decision recorded. Each must go in CREDENTIAL_KEYS ` +
        `(refused), RESOLVER_SECRET_KEYS (routed to the platform secret), or ` +
        `NOT_A_CREDENTIAL with a reason: ${unclassified.join(', ')}`
    ).toEqual([]);
  });

  it('refuses only keys that still exist in the schema', () => {
    const keys = new Set(schemaKeys());
    const stale = [...CREDENTIAL_KEYS].filter((key) => !keys.has(key));

    expect(stale, `refused keys no longer in @grantjs/env: ${stale.join(', ')}`).toEqual([]);
  });

  /**
   * The one credential the heuristic above cannot see, asserted by name.
   *
   * `DB_URL` holds a password inside a URL, and matches none of `SECRET`, `PASSWORD`,
   * `API_KEY`, `PRIVATE_KEY`, `ACCESS_KEY` or `CREDENTIAL`. Widening the pattern is
   * not the fix: `_URL$` would sweep in `APP_URL`, `DOCS_URL` and
   * `SECURITY_FRONTEND_URL` among others, and a heuristic that fires on eight
   * harmless keys is a heuristic people learn to add exclusions to without reading.
   * So this key is pinned individually, and the next URL-shaped credential gets a
   * line of its own here too.
   */
  it('classifies DB_URL, which the heuristic cannot match', () => {
    expect(schemaKeys()).toContain('DB_URL');
    expect(CREDENTIAL_SHAPED.test('DB_URL')).toBe(false);
    expect(STACK_COMPOSED_KEYS as readonly string[]).toContain('DB_URL');
  });

  it('never refuses a key that has a safe path', () => {
    const refused = new Set<string>(CREDENTIAL_KEYS);

    for (const key of RESOLVER_SECRET_KEYS) {
      expect(refused.has(key), `${key} is resolver-backed and must not be refused`).toBe(false);
    }
  });
});
