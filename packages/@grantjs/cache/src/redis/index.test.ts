import type { ILogger } from '@grantjs/core';
import { noopLogger } from '@grantjs/core';
import Redis from 'ioredis';
import { describe, expect, it } from 'vitest';

import { runCacheAdapterConformance } from '../conformance-suite';
import { RedisCacheAdapter } from './index';

const HOST = process.env.REDIS_HOST ?? 'localhost';
const PORT = Number(process.env.REDIS_PORT ?? 6379);
// The dev compose Redis runs with --requirepass, so an unauthenticated probe gets
// NOAUTH and looks indistinguishable from "not running". Default to the compose
// password rather than silently skipping the whole suite on a healthy Redis.
const PASSWORD = process.env.REDIS_PASSWORD || 'grant_redis_password';

/**
 * Reachability is probed once, before the suite is declared, so an unavailable
 * Redis skips cleanly instead of failing every test with a connection error.
 *
 * Slice 2 (`feat/aws-adapters-localstack`) makes this unconditional in CI by
 * bringing the backing services into the compose stacks. Until then the Redis
 * conformance run is a local gate: `docker compose up -d redis`.
 */
async function redisReachable(): Promise<boolean> {
  const probe = new Redis({
    host: HOST,
    port: PORT,
    password: PASSWORD,
    lazyConnect: true,
    connectTimeout: 1_000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

const available = await redisReachable();

if (!available) {
  describe.skip(`ICacheAdapter conformance: RedisCacheAdapter (no Redis at ${HOST}:${PORT})`, () => {
    it('skipped', () => {
      expect(true).toBe(true);
    });
  });
} else {
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
