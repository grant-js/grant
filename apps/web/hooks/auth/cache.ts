import { ApolloCache } from '@apollo/client';

export function evictAuthCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'me' });
  cache.gc();
}
