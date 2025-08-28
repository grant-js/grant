import { ApolloCache } from '@apollo/client';

export function evictRoleGroupsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'roleGroups' });
  cache.evict({ fieldName: 'roles' });
  cache.gc();
}
