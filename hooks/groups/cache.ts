import { ApolloCache } from '@apollo/client';

export const evictGroupsCache = (cache: ApolloCache<any>) => {
  cache.evict({ fieldName: 'groups' });
  cache.gc();
};
