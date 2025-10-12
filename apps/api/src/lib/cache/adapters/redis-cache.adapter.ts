import Redis from 'ioredis';

import { CacheKey } from '@/handlers/base/scope-handler';
import { ICacheAdapter } from '@/lib/cache/cache-adapter.interface';

/**
 * Redis cache adapter for distributed caching
 * Suitable for multi-instance deployments where cache consistency is critical
 * Requires a Redis server to be running and accessible
 */
export class RedisCacheAdapter implements ICacheAdapter {
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
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  private getFullKey(key: CacheKey): string {
    return `${this.prefix}${key}`;
  }

  async get(key: CacheKey): Promise<Set<string> | null> {
    const fullKey = this.getFullKey(key);
    const value = await this.client.get(fullKey);

    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as string[];
      return new Set(parsed);
    } catch (error) {
      console.error(`Failed to parse cache value for key ${key}:`, error);
      return null;
    }
  }

  async set(key: CacheKey, value: Set<string>): Promise<void> {
    const fullKey = this.getFullKey(key);
    const serialized = JSON.stringify(Array.from(value));

    // Set with 24 hour expiration by default
    await this.client.setex(fullKey, 86400, serialized);
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

    // Remove prefix from keys
    return keys.map((key: string) => key.replace(this.prefix, '') as CacheKey);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
