import type { CacheKey, ICacheAdapter, ILogger } from '@grantjs/core';
import Redis from 'ioredis';

/**
 * Redis cache adapter for distributed caching
 * Suitable for multi-instance deployments where cache consistency is critical
 * Requires a Redis server to be running and accessible
 */
export class RedisCacheAdapter implements ICacheAdapter {
  private client: Redis;
  private prefix: string;

  constructor(
    config: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      prefix?: string;
    },
    private readonly logger: ILogger
  ) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db ?? 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.prefix = config.prefix || 'grant:cache:';

    this.client.on('error', (err: Error) => {
      this.logger.error({
        msg: 'Redis Client Error',
        err,
      });
    });

    this.client.on('connect', () => {
      this.logger.info({
        msg: 'Redis Client Connected',
      });
    });
  }

  private getFullKey(key: CacheKey): string {
    return `${this.prefix}${key}`;
  }

  async get<T = Set<string>>(key: CacheKey): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const value = await this.client.get(fullKey);

    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return new Set(parsed) as T;
      }

      return parsed as T;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to parse cache value',
        err: error,
        key,
      });
      return null;
    }
  }

  async set<T = Set<string>>(key: CacheKey, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.getFullKey(key);

    let serialized: string;
    if (value instanceof Set) {
      serialized = JSON.stringify(Array.from(value));
    } else {
      serialized = JSON.stringify(value);
    }

    const ttl = ttlSeconds !== undefined ? ttlSeconds : 86400; // Default 24 hours
    await this.client.setex(fullKey, ttl, serialized);
  }

  async has(key: CacheKey): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const exists = await this.client.exists(fullKey);
    return exists === 1;
  }

  async delete(key: CacheKey): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.client.del(fullKey);
  }

  async clear(): Promise<void> {
    const fullKeys = await this.scanFullKeys(`${this.prefix}*`);
    if (fullKeys.length === 0) {
      return;
    }
    // DEL is variadic; batch to avoid huge argument lists on large keyspaces.
    const batchSize = 500;
    for (let i = 0; i < fullKeys.length; i += batchSize) {
      await this.client.del(...fullKeys.slice(i, i + batchSize));
    }
  }

  async keys(pattern?: string): Promise<CacheKey[]> {
    const searchPattern = pattern ? `${this.prefix}${pattern}` : `${this.prefix}*`;
    const fullKeys = await this.scanFullKeys(searchPattern);
    return fullKeys.map((key: string) => key.replace(this.prefix, '') as CacheKey);
  }

  /**
   * SCAN instead of KEYS: KEYS is O(N) and blocks the Redis event loop, which is
   * catastrophic when callers poll patterns frequently (or leak timers that do).
   *
   * De-duplicated because SCAN guarantees only that every key present for the
   * whole iteration is returned *at least* once — the same key can come back on
   * more than one cursor page when the keyspace is resized mid-iteration. Callers
   * treat the result as a set: `keys()` is compared for equality in tests, and
   * `clear()` would otherwise issue redundant DELs.
   */
  private async scanFullKeys(match: string): Promise<string[]> {
    const found = new Set<string>();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', match, 'COUNT', 100);
      cursor = nextCursor;
      for (const key of keys) {
        found.add(key);
      }
    } while (cursor !== '0');
    return Array.from(found);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
