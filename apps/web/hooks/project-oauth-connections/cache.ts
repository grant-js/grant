import { ApolloCache } from '@apollo/client';

export function evictProjectOAuthConnectionsCache(cache: ApolloCache): void {
  cache.evict({ fieldName: 'projectOAuthConnections' });
  cache.gc();
}
