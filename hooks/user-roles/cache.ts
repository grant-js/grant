import { ApolloCache } from '@apollo/client';

export function evictUserRolesCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'userRoles' });
  cache.evict({ fieldName: 'users' });
  cache.gc();
}
