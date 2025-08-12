import { ApolloCache } from '@apollo/client';

export function evictProjectTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projectTags' });
  cache.gc();
}
