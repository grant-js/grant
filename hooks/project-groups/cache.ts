import { ApolloCache } from '@apollo/client';

export const evictProjectGroupCache = (cache: ApolloCache<any>) => {
  cache.evict({
    id: 'ProjectGroup',
    fieldName: 'projectGroups',
  });
};
