import { ApolloCache } from '@apollo/client';

export function evictMeCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'me' });
  cache.evict({ fieldName: 'myUserSessions' });
  cache.evict({ fieldName: 'myUserAuthenticationMethods' });
  cache.gc();
}
