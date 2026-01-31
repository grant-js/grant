import { BadRequestError } from '@/lib/errors';

import { InMemoryCacheAdapter } from './adapters/in-memory-cache.adapter';
import { RedisCacheAdapter } from './adapters/redis-cache.adapter';
import { IEntityCacheAdapter } from './cache-adapter.interface';

export type CacheStrategy = 'memory' | 'redis';

export interface CacheConfig {
  strategy: CacheStrategy;
  redis?: {
    host: string;
    port: number;
    password?: string;
    prefix?: string;
  };
}

const entityTypes = [
  'roles',
  'users',
  'groups',
  'permissions',
  'resources',
  'tags',
  'projects',
  'apiKeys',
  'oauth',
  'rateLimit',
] as const;

/**
 * Cache factory - creates the appropriate cache adapter based on configuration
 * Implements the Strategy Pattern for swappable cache backends
 */
export class CacheFactory {
  /**
   * Create an entity cache adapter with the specified strategy
   * @param config - Cache configuration
   * @returns IEntityCacheAdapter with all entity-specific adapters
   */
  static createEntityCache(config: CacheConfig): IEntityCacheAdapter {
    const cache: Partial<IEntityCacheAdapter> = {};

    for (const entityType of entityTypes) {
      cache[entityType] = this.createAdapter(config, entityType);
    }

    return cache as IEntityCacheAdapter;
  }

  /**
   * Create a single cache adapter instance
   * @param config - Cache configuration
   * @param namespace - Optional namespace for cache keys (e.g., entity type)
   * @returns ICacheAdapter instance
   */
  private static createAdapter(config: CacheConfig, namespace?: string) {
    switch (config.strategy) {
      case 'redis':
        if (!config.redis) {
          throw new BadRequestError(
            'Redis configuration is required when using redis strategy',
            'errors:validation.required',
            { field: 'redis' }
          );
        }
        return new RedisCacheAdapter({
          ...config.redis,
          prefix: namespace ? `grant:${namespace}:` : 'grant:cache:',
        });

      case 'memory':
      default:
        return new InMemoryCacheAdapter();
    }
  }

  /**
   * Cleanup and disconnect all cache adapters
   * @param cache - Entity cache adapter to cleanup
   */
  static async disconnect(cache: IEntityCacheAdapter): Promise<void> {
    await Promise.all(entityTypes.map((entityType) => cache[entityType].disconnect()));
  }
}
