import { CacheKey } from '@/handlers/base/scope-handler';

/**
 * Cache adapter interface - defines the contract for cache implementations
 * Supports both in-memory and distributed cache strategies
 */
export interface ICacheAdapter {
  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns Promise resolving to Set of IDs or null if not found
   */
  get(key: CacheKey): Promise<Set<string> | null>;

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - Set of IDs to cache
   */
  set(key: CacheKey, value: Set<string>): Promise<void>;

  /**
   * Check if a key exists in the cache
   * @param key - The cache key
   * @returns Promise resolving to boolean
   */
  has(key: CacheKey): Promise<boolean>;

  /**
   * Delete a key from the cache
   * @param key - The cache key
   */
  delete(key: CacheKey): Promise<void>;

  /**
   * Clear all entries from the cache
   */
  clear(): Promise<void>;

  /**
   * Get all keys matching a pattern (optional, for debugging)
   * @param pattern - Optional pattern to match keys
   */
  keys(pattern?: string): Promise<CacheKey[]>;

  /**
   * Close/cleanup the cache connection
   */
  disconnect(): Promise<void>;
}

/**
 * Entity-specific cache structure
 * Maps entity types to their cache adapter instances
 */
export interface IEntityCacheAdapter {
  roles: ICacheAdapter;
  users: ICacheAdapter;
  groups: ICacheAdapter;
  permissions: ICacheAdapter;
  tags: ICacheAdapter;
  projects: ICacheAdapter;
  oauth: ICacheAdapter;
}
