import { ApolloCache } from '@apollo/client';

export function evictOrganizationProjectsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'organizationProjects' });
  cache.evict({ fieldName: 'projects' });
  cache.gc();
}
