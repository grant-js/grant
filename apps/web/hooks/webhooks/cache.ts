import { ApolloCache } from '@apollo/client';

export function evictWebhooksCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'webhookSubscriptions' });
  cache.evict({ fieldName: 'webhookSubscription' });
  cache.evict({ fieldName: 'webhookDeliveries' });
  cache.gc();
}
