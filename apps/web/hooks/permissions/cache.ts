import { ApolloCache } from '@apollo/client';

export const evictPermissionsCache = (cache: ApolloCache<any>) => {
  cache.evict({ fieldName: 'permissions' });
  cache.gc();
};
