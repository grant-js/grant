import { ApolloCache } from '@apollo/client';

export function evictGroupTagsCache(cache: ApolloCache<any>) {
  cache.evict({ fieldName: 'groupTags' });
  cache.evict({ fieldName: 'tags' });
  cache.gc();
}
