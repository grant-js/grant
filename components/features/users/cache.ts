import { ApolloCache } from '@apollo/client';

export function evictUsersCache(cache: ApolloCache<any>) {
  // Invalidate all user queries to force a refetch
  cache.evict({ fieldName: 'users' });
}
