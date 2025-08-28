import { ApolloCache } from '@apollo/client';

export function evictRolesCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'roles' });
  cache.gc();
}
