import { ApolloCache } from '@apollo/client';

export function evictOrganizationTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'organizationTags' });
  cache.evict({ fieldName: 'tags' });
  cache.gc();
}
