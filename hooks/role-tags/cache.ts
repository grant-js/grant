import { ApolloCache } from '@apollo/client';

export function evictRoleTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'roleTags' });
  cache.evict({ fieldName: 'roles' });
  cache.gc();
}
