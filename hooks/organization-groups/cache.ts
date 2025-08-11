import { ApolloCache } from '@apollo/client';

export function evictOrganizationGroupsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'organizationGroups' });
  cache.gc();
}
