import { ApolloCache } from '@apollo/client';

export function evictUsersCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'users' });
  cache.gc();
}
