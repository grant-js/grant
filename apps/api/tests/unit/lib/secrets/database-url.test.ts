import type { ISecretResolver } from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { resolveDatabaseConnectionString } from '@/lib/secrets';

/**
 * These guard a credential path, so they are written to fail if the port call is
 * removed. The suite runs with `SECRETS_PROVIDER=env`, under which the port returns
 * exactly what `config.db.url` already holds — meaning every *other* test in the
 * repository stays green if `resolveDatabaseConnectionString` were reduced to
 * `config.db.url`. Injecting a resolver that returns something distinguishable is the
 * only way to observe that the port is actually consulted.
 */
function resolverReturning(value: string | undefined): ISecretResolver {
  return { resolve: vi.fn().mockResolvedValue(value) };
}

describe('resolveDatabaseConnectionString', () => {
  it('prefers the resolved secret over the environment-derived config', async () => {
    const fromSecretsManager = 'postgresql://rotated:pw@proxy.internal:5432/grant_db';
    const resolver = resolverReturning(fromSecretsManager);

    const url = await resolveDatabaseConnectionString(resolver);

    expect(url).toBe(fromSecretsManager);
    // Without this the assertion above could pass on a coincidence.
    expect(url).not.toBe(config.db.url);
  });

  it('asks for the secret under its canonical environment-variable name', async () => {
    // The name is the stable key across implementations; the AWS resolver looks it up
    // in the secret payload by exactly this string, so a rename silently falls through
    // to process.env instead of failing.
    const resolver = resolverReturning('postgresql://x/y');

    await resolveDatabaseConnectionString(resolver);

    expect(resolver.resolve).toHaveBeenCalledWith('DB_URL');
  });

  it('falls back to config.db.url when the secret is not configured', async () => {
    // The Docker and Kubernetes path: nothing is registered under DB_URL in the
    // resolver, and behavior must be identical to before the port existed.
    const url = await resolveDatabaseConnectionString(resolverReturning(undefined));

    expect(url).toBe(config.db.url);
  });

  it('treats an empty resolved value as unconfigured', async () => {
    // The env schema defaults secret keys to '', so '' reaches callers as "absent".
    // Passing it through would hand postgres.js an empty connection string.
    const url = await resolveDatabaseConnectionString(resolverReturning(''));

    expect(url).toBe(config.db.url);
  });

  it('propagates a resolver failure instead of falling back', async () => {
    // On a target pointed at Secrets Manager, config.db.url is whatever the
    // environment happens to hold — stale, or the local development database.
    // Connecting to the wrong database is worse than failing to start.
    const resolver: ISecretResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('AccessDeniedException')),
    };

    await expect(resolveDatabaseConnectionString(resolver)).rejects.toThrow(
      'AccessDeniedException'
    );
  });

  it('defaults to the process-wide resolver when none is injected', async () => {
    // Covers the wiring both entrypoints rely on: they call this with no argument.
    // Under SECRETS_PROVIDER=env that resolves to the same value as the fallback, so
    // this asserts the default parameter is present and usable, not which branch won.
    await expect(resolveDatabaseConnectionString()).resolves.toBe(config.db.url);
  });
});
