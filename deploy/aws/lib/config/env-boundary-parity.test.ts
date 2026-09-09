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
 * `GrantPlatformProps.secrets` is a third boundary with a different destination — the
 * platform secret rather than the function — so it is held to a different rule and
 * covered here too, rather than in a file of its own where it would drift.
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
import { assertConfigurableEnv, assertConfigurableSecrets } from './validate';

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

/** True when `props.secrets` — the platform-secret boundary — refuses it. */
function secretsRefuses(key: string): boolean {
  try {
    assertConfigurableSecrets({ [key]: 'sentinel' }, 'secrets');
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

  // Resolver-backed keys are where "parity" stops meaning "refuse the same thing".
  //
  // The file *routes* them to the platform secret, so it must not refuse them. Props
  // has no routing step — whatever is in `env` becomes a Lambda environment variable —
  // so the equivalent safety there is refusal, with `secrets` as the destination.
  //
  // This test previously asserted only `fileRefuses(key) === false` and never called
  // `propsRefuses` at all, so the parity test was blind on exactly the two keys it
  // named. `AUTH_MFA_SECRET_ENCRYPTION_KEY` and `GITHUB_CLIENT_SECRET` synthesized as
  // plaintext Lambda environment variables through props for the whole story. Gate 4,
  // finding C-1.
  describe('resolver-backed keys reach the platform secret and never a function', () => {
    it.each(RESOLVER_SECRET_KEYS)('the env file routes %s rather than refusing it', (key) => {
      expect(fileRefuses(key), `${key} is resolver-backed and the file must route it`).toBe(false);

      const { env, secrets } = classifyConfig(parseEnvFile(`${key}=sentinel`));
      expect(secrets[key], `${key} must land in the platform secret`).toBe('sentinel');
      expect(env, `${key} must not also become an environment variable`).not.toHaveProperty(key);
    });

    it.each(RESOLVER_SECRET_KEYS)('props.env refuses %s, naming secrets instead', (key) => {
      expect(
        propsRefuses(key),
        `${key}: GrantPlatformProps.env has no routing step, so accepting it makes it ` +
          `a plaintext Lambda environment variable`
      ).toBe(true);

      expect(() => assertConfigurableEnv({ [key]: 'sentinel' }, 'env')).toThrow(/secrets/);
    });

    it.each(RESOLVER_SECRET_KEYS)('props.secrets accepts %s — it is what it is for', (key) => {
      expect(secretsRefuses(key), `${key} is what GrantPlatformProps.secrets exists for`).toBe(
        false
      );
    });
  });

  // The platform secret is a safe *destination*, which is a different question from
  // which keys may go there. Nothing checked the keys at all until gate 4 found
  // `ORIGIN_VERIFY_SECRET` — refused by name on both other boundaries — accepted here,
  // and a `DB_URL` that silently overrode the validated one. Findings H-1 and M-1.
  describe('props.secrets refuses what the stack owns', () => {
    it.each([...STACK_GENERATED_KEYS, ...STACK_COMPOSED_KEYS])(
      '%s is generated or composed by the stack, so secrets refuses it too',
      (key) => {
        expect(secretsRefuses(key), `${key}: props.secrets accepted a key the stack owns`).toBe(
          true
        );
      }
    );

    it.each(CREDENTIAL_KEYS)('%s in the platform secret would never be read', (key) => {
      // Refused for the opposite reason to the others: the adapters read these from
      // `process.env`, so a value here is one the application never sees. Accepting it
      // is a deploy that succeeds while the credential silently never arrives.
      expect(secretsRefuses(key), `${key}: accepted into a secret nothing reads it from`).toBe(
        true
      );
    });

    it('refuses a lower-case spelling, like every other boundary', () => {
      for (const key of ['db_url', 'github_client_secret']) {
        expect(secretsRefuses(key), `${key}: props.secrets`).toBe(true);
      }
    });
  });
});
