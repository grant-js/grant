import { ApolloCache } from '@apollo/client';

export function evictProjectRolesCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projectRoles' });
  cache.gc();
}
