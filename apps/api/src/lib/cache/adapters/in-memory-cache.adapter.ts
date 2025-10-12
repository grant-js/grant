import { CacheKey } from '@/handlers/base/scope-handler';
import { ICacheAdapter } from '@/lib/cache/cache-adapter.interface';

/**
 * In-memory cache adapter using native JavaScript Map
 * Fast and simple, but not suitable for distributed/multi-instance deployments
 * Best for development and single-instance production deployments
 */
export class InMemoryCacheAdapter implements ICacheAdapter {
  private cache: Map<CacheKey, Set<string>>;

  constructor() {
    this.cache = new Map();
  }

  async get(key: CacheKey): Promise<Set<string> | null> {
    const value = this.cache.get(key);
    return value ?? null;
  }

  async set(key: CacheKey, value: Set<string>): Promise<void> {
    this.cache.set(key, value);
  }

  async has(key: CacheKey): Promise<boolean> {
    return this.cache.has(key);
  }

  async delete(key: CacheKey): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<CacheKey[]> {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern) {
      return allKeys;
    }
    // Simple pattern matching with wildcards
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter((key) => regex.test(key));
  }

  async disconnect(): Promise<void> {
    // No connection to close for in-memory cache
    this.cache.clear();
  }
}
