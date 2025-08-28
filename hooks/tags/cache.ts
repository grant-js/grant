import { ApolloCache } from '@apollo/client';

export function evictTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'tags' });
  cache.gc();
}
