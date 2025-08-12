import { ApolloCache } from '@apollo/client';

export function evictUserTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'userTags' });
  cache.gc();
}
