import type { ISecretResolver } from '@grantjs/core';

import { config } from '@/config';

import { secretResolver } from './resolver';

/**
 * The database connection string, resolved through the secret port rather than read
 * from the environment.
 *
 * ADR 0004 resolves secrets at the point of use instead of materializing them into
 * `process.env` before boot, because `@grantjs/env` freezes its parsed result on first
 * import — so anything in the environment is pinned for the life of the process and a
 * rotation cannot reach it. `DB_URL` is the first credential-bearing value to move
 * across, which the ADR anticipated: "adoption is incremental, keys move over one at a
 * time".
 *
 * Falls back to `config.db.url`, so nothing changes for the environment-backed
 * resolver — `SECRETS_PROVIDER=env` reads exactly what it read before, and the Docker
 * and Kubernetes targets are untouched. On AWS the value comes from Secrets Manager and
 * a rotation is picked up within `SECRETS_CACHE_TTL_SECONDS` rather than at the next
 * redeploy.
 *
 * Named for the `connectionString` field it feeds, to keep it distinct from
 * `@grantjs/env`'s `resolveDatabaseUrl()`, which composes `config.db.url` itself from
 * `DB_URL` or the discrete `DB_HOST`/`DB_PORT`/… parts. That one produces the fallback
 * this one layers the port on top of.
 *
 * A resolver failure propagates rather than falling back. On a target that has been
 * pointed at Secrets Manager, `config.db.url` is whatever the environment happens to
 * hold — stale, or the local development database. Connecting to the wrong database is
 * worse than failing to start.
 *
 * @param resolver Overrides the process-wide resolver. Present so tests can inject a
 *   fake; production callers leave it unset — the same shape as
 *   `CreateServicesOptions.secrets`.
 */
export async function resolveDatabaseConnectionString(
  resolver: ISecretResolver = secretResolver
): Promise<string> {
  return (await resolver.resolve('DB_URL')) || config.db.url;
}
