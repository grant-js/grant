/**
 * The two configuration boundaries must refuse the same keys.
 *
 * There are two ways a value becomes a container environment variable, and they have
 * different code in front of them:
 *
 *   - the env **file**, parsed by `parseEnvFile` and classified by `classifyConfig`;
 *   - **`GrantPlatformProps.env`** and `props.web.env`, which ADR 0005 explicitly
 *     invites an adopter to construct directly when they replace `bin/`.
 *
 * They reach the identical `Environment.Variables` on the identical Lambda. Slice 2
 * guarded the second with a list of its own, and a security review found that list
 * held one key where the file's held twenty — `DB_GRANT_ROLE_URL`, a superuser
 * connection string, among the nineteen that synthesized into the template in
 * plaintext.
 *
 * So this is an oracle rather than a unit test, in the same shape as
 * `credential-keys.test.ts`: it asserts the two paths agree, key for key, and fails
 * naming any key one refuses and the other does not. Adding a key to one list is now
 * enough; forgetting the other is what this catches.
 */
import { describe, expect, it } from 'vitest';

import {
  classifyConfig,
  CREDENTIAL_KEYS,
  parseEnvFile,
  RESOLVER_SECRET_KEYS,
  STACK_COMPOSED_KEYS,
  STACK_GENERATED_KEYS,
} from './env-file';
import { assertConfigurableEnv } from './validate';

/**
 * True when the env-file path refuses this key outright rather than routing it.
 *
 * Goes through `parseEnvFile` as well as `classifyConfig`, because the boundary is a
 * line in a file, not a pre-parsed object — and the two rules live in different
 * halves: the key-shape rule is the parser's, the three refusal lists are the
 * classifier's. Calling only the classifier is how this oracle first reported a false
 * divergence on lower-case keys.
 */
function fileRefuses(key: string): boolean {
  try {
    classifyConfig(parseEnvFile(`${key}=sentinel`));
    return false;
  } catch {
    return true;
  }
}

/** True when the props path refuses it. */
function propsRefuses(key: string): boolean {
  try {
    assertConfigurableEnv({ [key]: 'sentinel' }, 'env');
    return false;
  } catch {
    return true;
  }
}

const ALL_REFUSED = [...STACK_GENERATED_KEYS, ...STACK_COMPOSED_KEYS, ...CREDENTIAL_KEYS];

describe('the file and the props refuse the same keys', () => {
  it.each(ALL_REFUSED)('%s is refused on both paths', (key) => {
    expect(fileRefuses(key), `${key}: the env file does not refuse it`).toBe(true);
    expect(propsRefuses(key), `${key}: GrantPlatformProps.env does not refuse it`).toBe(true);
  });

  it('finds no key either path refuses alone', () => {
    const divergent = ALL_REFUSED.filter((key) => fileRefuses(key) !== propsRefuses(key));

    expect(
      divergent,
      `Refused by one boundary and not the other. Both read the same three lists in ` +
        `env-file.ts; a key that appears here means one path grew a rule the other ` +
        `did not: ${divergent.join(', ')}`
    ).toEqual([]);
  });

  it('refuses a lower-case spelling on both paths', () => {
    // `process.env` is case-sensitive and @grantjs/env declares only upper-case keys,
    // so a lower-case key is read by nothing while its value still reaches the
    // template. Both paths apply ENV_KEY_SHAPE for that reason.
    for (const key of ['db_url', 'smtp_password', 'origin_verify_secret']) {
      expect(fileRefuses(key), `${key}: env file`).toBe(true);
      expect(propsRefuses(key), `${key}: props`).toBe(true);
    }
  });

  it('keeps resolver-backed keys off both refusal lists', () => {
    // These have a safe path: the file routes them to the platform secret, and from
    // props they belong in `GrantPlatformProps.secrets` as a SecretValue. Refusing
    // them would remove the only way to supply them.
    for (const key of RESOLVER_SECRET_KEYS) {
      expect(fileRefuses(key), `${key} is resolver-backed and must not be refused`).toBe(false);
    }
  });
});
