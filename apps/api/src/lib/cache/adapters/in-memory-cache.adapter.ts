import { CacheKey, ICacheAdapter } from '@/lib/cache';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class InMemoryCacheAdapter implements ICacheAdapter {
  private cache: Map<CacheKey, CacheEntry<unknown>>;

  constructor() {
    this.cache = new Map();
  }

  async get<T = Set<string>>(key: CacheKey): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T = Set<string>>(key: CacheKey, value: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    };
    this.cache.set(key, entry);
  }

  async has(key: CacheKey): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: CacheKey): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern?: string): Promise<CacheKey[]> {
    const allKeys = Array.from(this.cache.keys()) as CacheKey[];
    if (!pattern) {
      return allKeys;
    }
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter((key) => regex.test(key));
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
  }
}
