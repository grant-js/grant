import type { IEntityCacheAdapter, ILoggerFactory } from '@grantjs/core';
import { ConfigurationError, noopLogger } from '@grantjs/core';

import { DynamoDbCacheAdapter, type DynamoDbCacheConfig } from './dynamodb';
import { InMemoryCacheAdapter } from './memory';
import { RedisCacheAdapter } from './redis';

type CacheStrategy = 'memory' | 'redis' | 'dynamodb';

interface CacheConfig {
  strategy: CacheStrategy;
  redis?: {
    host: string;
    port: number;
    password?: string;
    /** Redis logical database index (0–15 typical). Must match across all API replicas. */
    db?: number;
    prefix?: string;
  };
  /** `namespace` is supplied per entity type by the factory, not by the caller. */
  dynamodb?: Omit<DynamoDbCacheConfig, 'namespace'>;
}

const entityTypes = [
  'roles',
  'users',
  'groups',
  'permissions',
  'resources',
  'tags',
  'projects',
  'projectApps',
  'apiKeys',
  'signingKeys',
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
   * @param loggerFactory - Optional logger factory for creating scoped loggers
   * @returns IEntityCacheAdapter with all entity-specific adapters
   */
  static createEntityCache(
    config: CacheConfig,
    loggerFactory?: ILoggerFactory
  ): IEntityCacheAdapter {
    const cache: Partial<IEntityCacheAdapter> = {};

    for (const entityType of entityTypes) {
      cache[entityType] = this.createAdapter(config, loggerFactory, entityType);
    }

    return cache as IEntityCacheAdapter;
  }

  /**
   * Create a single cache adapter instance
   * @param config - Cache configuration
   * @param loggerFactory - Optional logger factory for creating scoped loggers
   * @param namespace - Optional namespace for cache keys (e.g., entity type)
   * @returns ICacheAdapter instance
   */
  private static createAdapter(
    config: CacheConfig,
    loggerFactory?: ILoggerFactory,
    namespace?: string
  ) {
    switch (config.strategy) {
      case 'redis':
        if (!config.redis) {
          throw new ConfigurationError('Redis configuration is required when using redis strategy');
        }
        return new RedisCacheAdapter(
          {
            ...config.redis,
            prefix: namespace ? `grant:${namespace}:` : 'grant:cache:',
          },
          loggerFactory?.createLogger(`RedisCacheAdapter:${namespace ?? 'default'}`) ?? noopLogger
        );

      case 'dynamodb':
        if (!config.dynamodb) {
          throw new ConfigurationError(
            'DynamoDB configuration is required when using dynamodb strategy'
          );
        }
        return new DynamoDbCacheAdapter(
          {
            ...config.dynamodb,
            // Mirrors the Redis prefix scheme: one partition per entity type.
            namespace: namespace ? `grant:${namespace}` : 'grant:cache',
          },
          loggerFactory?.createLogger(`DynamoDbCacheAdapter:${namespace ?? 'default'}`) ??
            noopLogger
        );

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
