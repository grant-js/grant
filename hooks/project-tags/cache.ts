import { ApolloCache } from '@apollo/client';

export function evictProjectTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'projects' });
  cache.evict({ fieldName: 'tags' });
  cache.gc();
}
