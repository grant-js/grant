import { ApolloCache } from '@apollo/client';

export function evictOrganizationsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'organizations' });
  cache.gc();
}
