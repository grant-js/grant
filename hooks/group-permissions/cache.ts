import { ApolloCache } from '@apollo/client';

export function evictGroupPermissionsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'groupPermissions' });
  cache.evict({ fieldName: 'groups' });
  cache.gc();
}
