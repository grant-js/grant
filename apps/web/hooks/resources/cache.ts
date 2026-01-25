import { ApolloCache } from '@apollo/client';

export const evictResourcesCache = (cache: ApolloCache) => {
  cache.evict({ fieldName: 'resources' });
  cache.gc();
};
