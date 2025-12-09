import { ApolloCache } from '@apollo/client';

export function evictApiKeysCache(cache: ApolloCache) {
  cache.evict({
    fieldName: 'apiKeys',
  });
  cache.gc();
}
