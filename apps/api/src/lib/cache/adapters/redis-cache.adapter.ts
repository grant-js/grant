import Redis from 'ioredis';

import { CacheKey, ICacheAdapter } from '@/lib/cache';
import { createModuleLogger } from '@/lib/logger';

/**
 * Redis cache adapter for distributed caching
 * Suitable for multi-instance deployments where cache consistency is critical
 * Requires a Redis server to be running and accessible
 */
export class RedisCacheAdapter implements ICacheAdapter {
  private readonly logger = createModuleLogger('RedisCacheAdapter');
  private client: Redis;
  private prefix: string;

  constructor(config: { host: string; port: number; password?: string; prefix?: string }) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
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
    const pattern = `${this.prefix}*`;
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async keys(pattern?: string): Promise<CacheKey[]> {
    const searchPattern = pattern ? `${this.prefix}${pattern}` : `${this.prefix}*`;
    const keys = await this.client.keys(searchPattern);

    return keys.map((key: string) => key.replace(this.prefix, '') as CacheKey);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
