import { Tenant } from '@grantjs/schema';

// CacheKey supports both tenant-based keys (e.g., "account:123") and custom keys (e.g., "auth:permissions:userId:account:123")
export type CacheKey = `${Tenant}:${string}` | string;

export interface ICacheAdapter {
  get<T = Set<string>>(key: CacheKey): Promise<T | null>;

  set<T = Set<string>>(key: CacheKey, value: T, ttlSeconds?: number): Promise<void>;

  has(key: CacheKey): Promise<boolean>;

  delete(key: CacheKey): Promise<void>;

  clear(): Promise<void>;

  keys(pattern?: string): Promise<CacheKey[]>;

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
  resources: ICacheAdapter;
  tags: ICacheAdapter;
  projects: ICacheAdapter;
  apiKeys: ICacheAdapter;
  oauth: ICacheAdapter;
}
