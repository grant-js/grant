import { ApolloCache } from '@apollo/client';

export function evictProjectRolesCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projectRoles' });
  cache.evict({ fieldName: 'roles' });
  cache.gc();
}
