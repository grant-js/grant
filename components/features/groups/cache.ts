import { ApolloCache } from '@apollo/client';

export const evictGroupsCache = (cache: ApolloCache<any>) => {
  // Evict all groups-related queries from cache
  cache.evict({ fieldName: 'groups' });
  cache.gc();
};
