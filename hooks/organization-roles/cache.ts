import { ApolloCache } from '@apollo/client';

export function evictOrganizationRolesCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'roles' });
  cache.gc();
}
