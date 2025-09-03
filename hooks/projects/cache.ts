import { ApolloCache } from '@apollo/client';

export function evictProjectsCache(cache: ApolloCache<any>) {
  cache.evict({
    fieldName: 'projects',
  });
  cache.gc();
}
