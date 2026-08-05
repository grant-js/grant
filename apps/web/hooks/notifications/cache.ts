import { ApolloCache } from '@apollo/client';

export function evictNotificationsCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'myNotifications' });
  cache.evict({ fieldName: 'myUnreadNotificationCount' });
  cache.gc();
}

export function evictNotificationPreferencesCache(cache: ApolloCache) {
  cache.evict({ fieldName: 'myNotificationPreferences' });
  cache.gc();
}
