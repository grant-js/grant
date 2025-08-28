import { ApolloCache } from '@apollo/client';

export function evictProjectPermissionsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projectPermissions' });
  cache.evict({ fieldName: 'permissions' });
  cache.gc();
}
