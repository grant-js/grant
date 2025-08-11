import { ApolloCache } from '@apollo/client';

export function evictProjectUsersCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projectUsers' });
  cache.evict({ fieldName: 'users' });
  cache.gc();
}
