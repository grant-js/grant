import type { ISecretResolver } from '@grantjs/core';

import { config } from './env.config';

/**
 * Credentials, resolved through `ISecretResolver` instead of read from the environment.
 *
 * **The problem this closes.** A Lambda environment variable is a literal string in the
 * CloudFormation template, in the function configuration, and in `cdk.out` on disk —
 * readable by anyone holding `cloudformation:GetTemplate` or
 * `lambda:GetFunctionConfiguration`. Lambda has no equivalent of the ECS task's
 * `Secrets`/`ValueFrom`, so the AWS target refused seventeen credential-shaped keys
 * outright rather than leak them (`deploy/aws/lib/config/env-file.ts`). Honest, and a
 * capability gap: an adopter needing Mailgun, S3 with static keys, or a password-
 * protected Redis could not deploy that target at all.
 *
 * **Nothing here is new machinery.** `ISecretResolver` (ADR 0004) already carries
 * `DB_URL`, `ORIGIN_VERIFY_SECRET`, `GITHUB_CLIENT_SECRET` and
 * `AUTH_MFA_SECRET_ENCRYPTION_KEY`. This widens the set of keys that travel it.
 *
 * **Why an overlay rather than async config.** `config` is a module-level synchronous
 * const and its credential fields cannot become promises without changing every
 * consumer. They do not need to: every adapter is constructed inside or after
 * `createApp()`, which is already async, so resolving once in the composition root and
 * writing the values into `config` before the first adapter is built leaves all of them
 * untouched. The adapters read what they always read.
 *
 * **The env path is unchanged.** `EnvSecretResolver` returns exactly what `process.env`
 * holds, so on Docker and Kubernetes this overlays the same values by a different
 * route. `SECRETS_PROVIDER` defaults to `env`; nothing about those targets moves.
 *
 * **What this does change, and it is a real trade.** These values are captured at boot,
 * so a rotation reaches them when the container is replaced — *not* within
 * `SECRETS_CACHE_TTL_SECONDS`. That differs from `ORIGIN_VERIFY_SECRET`, which the
 * middleware resolves per request and which therefore does track the TTL. It is
 * inherent to the shape rather than an oversight: an adapter that captured its
 * credential at construction cannot observe a later one. Rotating any key here means
 * rolling the functions, and the guide says so.
 */

/** One credential and the field in `config` it lands in. */
interface CredentialBinding {
  /** The canonical environment-variable name, which is also the resolver's key. */
  readonly key: string;

  /**
   * Where it lands, as a dotted path into `config`. Present so the log line and this
   * table read the same, and so a reviewer can check the pair without following
   * `apply` — which is the whole point of enumerating these rather than reflecting
   * over them.
   */
  readonly path: string;

  /** Reads the current value. Used by tests and by the "already set" accounting. */
  readonly read: () => string | undefined;

  /** Writes a resolved value into `config`. */
  readonly apply: (value: string) => void;
}

/**
 * Drops `readonly` for one assignment.
 *
 * The config tree is `as const` so that ordinary code cannot write to it, which is
 * correct and is exactly the property this module has to break — once, at boot, in a
 * place a reviewer can see. Confined to a named helper rather than spread as inline
 * casts so that `grep -n 'writable(' ` finds every write to configuration in the app.
 */
function writable<T extends object>(target: T): { -readonly [K in keyof T]: T[K] } {
  return target;
}

/**
 * Every credential that resolves through the port, and where each one lands.
 *
 * Enumerated, never reflective. This list is meant to be diffed by eye against
 * `CREDENTIAL_KEYS` in `deploy/aws/lib/config/env-file.ts`: thirteen entries here, four
 * deliberately absent, seventeen in total. The four and their reasons:
 *
 *   - `DB_GRANT_ROLE_URL` — read by `@grantjs/database`'s `grant-rls-login-role.lib.ts`
 *     during a migration, outside any composition root, and it is a **superuser** URL.
 *     Routing it means changing the shape of the RLS grant path, which is its own
 *     story. It stays refused.
 *   - `POSTGRES_PASSWORD` — not read here at all. `@grantjs/env` composes `DB_URL` from
 *     it when the discrete parts are used, and `DB_URL` already resolves through the
 *     port (`lib/secrets/database-url.ts`). It has a route; it is just not this one.
 *   - `E2E_DB_URL`, `E2E_REDIS_PASSWORD` — test-harness keys with no production caller.
 *     Giving them a production secret store would be inventing a use for them.
 */
const CREDENTIAL_BINDINGS: readonly CredentialBinding[] = [
  {
    key: 'CACHE_DYNAMODB_ACCESS_KEY_ID',
    path: 'cache.dynamodb.accessKeyId',
    read: () => config.cache.dynamodb.accessKeyId,
    apply: (value) => {
      writable(config.cache.dynamodb).accessKeyId = value;
    },
  },
  {
    key: 'CACHE_DYNAMODB_SECRET_ACCESS_KEY',
    path: 'cache.dynamodb.secretAccessKey',
    read: () => config.cache.dynamodb.secretAccessKey,
    apply: (value) => {
      writable(config.cache.dynamodb).secretAccessKey = value;
    },
  },
  {
    key: 'REDIS_PASSWORD',
    path: 'redis.password',
    read: () => config.redis.password,
    apply: (value) => {
      writable(config.redis).password = value;
    },
  },
  {
    key: 'SECURITY_API_KEY',
    path: 'security.apiKey',
    read: () => config.security.apiKey,
    apply: (value) => {
      writable(config.security).apiKey = value;
    },
  },
  {
    key: 'MAILGUN_API_KEY',
    path: 'email.mailgun.apiKey',
    read: () => config.email.mailgun.apiKey,
    apply: (value) => {
      writable(config.email.mailgun).apiKey = value;
    },
  },
  {
    key: 'MAILJET_API_KEY',
    path: 'email.mailjet.apiKey',
    read: () => config.email.mailjet.apiKey,
    apply: (value) => {
      writable(config.email.mailjet).apiKey = value;
    },
  },
  {
    key: 'MAILJET_SECRET_KEY',
    path: 'email.mailjet.secretKey',
    read: () => config.email.mailjet.secretKey,
    apply: (value) => {
      writable(config.email.mailjet).secretKey = value;
    },
  },
  {
    key: 'EMAIL_SES_CLIENT_SECRET',
    path: 'email.ses.clientSecret',
    read: () => config.email.ses.clientSecret,
    apply: (value) => {
      writable(config.email.ses).clientSecret = value;
    },
  },
  {
    key: 'SMTP_PASSWORD',
    path: 'email.smtp.password',
    read: () => config.email.smtp.password,
    apply: (value) => {
      writable(config.email.smtp).password = value;
    },
  },
  {
    key: 'STORAGE_S3_ACCESS_KEY_ID',
    path: 'storage.s3.accessKeyId',
    read: () => config.storage.s3.accessKeyId,
    apply: (value) => {
      writable(config.storage.s3).accessKeyId = value;
    },
  },
  {
    key: 'STORAGE_S3_SECRET_ACCESS_KEY',
    path: 'storage.s3.secretAccessKey',
    read: () => config.storage.s3.secretAccessKey,
    apply: (value) => {
      writable(config.storage.s3).secretAccessKey = value;
    },
  },
  {
    key: 'JOBS_AWS_ACCESS_KEY_ID',
    path: 'jobs.aws.accessKeyId',
    read: () => config.jobs.aws.accessKeyId,
    apply: (value) => {
      writable(config.jobs.aws).accessKeyId = value;
    },
  },
  {
    key: 'JOBS_AWS_SECRET_ACCESS_KEY',
    path: 'jobs.aws.secretAccessKey',
    read: () => config.jobs.aws.secretAccessKey,
    apply: (value) => {
      writable(config.jobs.aws).secretAccessKey = value;
    },
  },
];

/** The keys this module routes, for tests and for the AWS target's own list. */
export const RESOLVABLE_CREDENTIAL_KEYS: readonly string[] = CREDENTIAL_BINDINGS.map(
  (binding) => binding.key
);

/** Names only — never a value, and never a length, which is itself a hint. */
export interface CredentialResolutionSummary {
  /** Keys the resolver supplied, which were written into `config`. */
  readonly resolved: readonly string[];
}

/**
 * Overlays resolver-provided credentials onto `config`.
 *
 * **Must run before `validateConfig()`**, and that ordering is what makes a missing
 * credential fail closed rather than degrade. `validateConfig` already refuses to boot
 * when the selected provider's credentials are absent — `MAILGUN_API_KEY` under
 * `EMAIL_PROVIDER=mailgun`, and so on. Running the overlay first means those checks see
 * the resolved values, so a deployment keeping its key in Secrets Manager passes, and
 * one whose secret is missing or misnamed fails at boot with a configuration error
 * instead of constructing an adapter around an empty string. byo-database's F4 is the
 * precedent: an empty `DB_URL` surfaced as a connection error to `localhost` rather
 * than as the configuration problem it was.
 *
 * **A resolver failure propagates.** On a target pointed at Secrets Manager, falling
 * back to the environment means falling back to whatever the environment happens to
 * hold — usually nothing, occasionally a stale local value. Same reasoning as
 * `resolveDatabaseConnectionString`, and the same conclusion: refusing to start beats
 * starting wrong.
 *
 * Resolved in parallel because the AWS resolver caches the whole secret payload on the
 * first lookup, so thirteen keys cost one network call either way — but thirteen
 * sequential awaits would still be thirteen round trips on a cold start if that ever
 * changed.
 */
export async function resolveCredentials(
  resolver: ISecretResolver
): Promise<CredentialResolutionSummary> {
  const results = await Promise.all(
    CREDENTIAL_BINDINGS.map(
      async (binding) => [binding, await resolver.resolve(binding.key)] as const
    )
  );

  const resolved: string[] = [];

  for (const [binding, value] of results) {
    // Falsy covers both `undefined` and `''`. Both resolvers normalize an unset secret
    // to `undefined`, but a secret payload that carries a key with an empty value would
    // otherwise blank whatever the environment supplied — turning a configured adapter
    // into an unconfigured one, silently, which is the failure this whole slice is
    // about avoiding.
    if (!value) continue;

    binding.apply(value);
    resolved.push(binding.key);
  }

  return { resolved };
}
