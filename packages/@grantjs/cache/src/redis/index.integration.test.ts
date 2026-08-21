import type { ILogger } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import Redis from 'ioredis';
import { describe, expect, it } from 'vitest';

import { runCacheAdapterConformance } from '../conformance-suite';
import { RedisCacheAdapter } from './index';

// Backed by the e2e stack's Redis (docker-compose.e2e.yml), not the development
// stack. Started by scripts/e2e.sh, or directly:
//   docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e \
//     up -d redis localstack
const HOST = process.env.E2E_REDIS_HOST ?? 'localhost';
const PORT = Number(process.env.E2E_REDIS_PORT ?? 6380);
// That Redis runs with --requirepass, so an unauthenticated probe gets NOAUTH,
// which is indistinguishable from "not running".
const PASSWORD = process.env.E2E_REDIS_PASSWORD || 'grant_redis_password';

/**
 * Reachability is probed once so an absent backend produces an actionable
 * message rather than a wall of ioredis connection errors.
 *
 * There is deliberately no skip path. This file only runs in the integration
 * lane, and invoking that lane asserts the stack is up — a suite that quietly
 * skipped would be indistinguishable from one that passed, which is exactly the
 * failure mode worth preventing here.
 */
async function assertRedisReachable(): Promise<void> {
  const probe = new Redis({
    host: HOST,
    port: PORT,
    password: PASSWORD,
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  try {
    await probe.connect();
    await probe.ping();
  } catch (error) {
    throw new Error(
      `No Redis at ${HOST}:${PORT} for the adapter integration lane. Start it with: ` +
        'docker compose -f docker-compose.e2e.yml --env-file .env.test -p grant-e2e ' +
        'up -d redis localstack',
      { cause: error }
    );
  } finally {
    probe.disconnect();
  }
}

await assertRedisReachable();

{
  // Unique prefix per run so a shared Redis cannot leak state between runs, and
  // so clear() (itself under test) only ever touches this run's keys.
  const prefix = `grant:conformance:${process.pid}:${Date.now()}:`;

  runCacheAdapterConformance(
    'RedisCacheAdapter',
    {
      create: () =>
        new RedisCacheAdapter(
          { host: HOST, port: PORT, password: PASSWORD, prefix },
          noopLogger as ILogger
        ),
      teardown: async (adapter) => {
        await adapter.clear();
        await adapter.disconnect();
      },
    },
    // JSON round-trips through Redis.
    { serializes: true }
  );

  describe('RedisCacheAdapter — documented divergences', () => {
    it('leaves data in Redis after disconnect()', async () => {
      const survivor = new RedisCacheAdapter(
        { host: HOST, port: PORT, password: PASSWORD, prefix: `${prefix}survivor:` },
        noopLogger as ILogger
      );
      await survivor.set('k', 'v');
      await survivor.disconnect();

      const reconnected = new RedisCacheAdapter(
        { host: HOST, port: PORT, password: PASSWORD, prefix: `${prefix}survivor:` },
        noopLogger as ILogger
      );
      expect(await reconnected.get<string>('k')).toBe('v');

      await reconnected.clear();
      await reconnected.disconnect();
    });
  });
}
