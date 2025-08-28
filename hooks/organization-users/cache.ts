import { ApolloCache } from '@apollo/client';

export function evictOrganizationUsersCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'organizationUsers' });
  cache.evict({ fieldName: 'users' });
  cache.gc();
}
