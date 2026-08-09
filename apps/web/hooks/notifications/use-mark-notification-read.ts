import { useMutation } from '@apollo/client/react';
import {
  MarkMyNotificationReadDocument,
  type MarkMyNotificationReadMutation,
} from '@grantjs/schema';

import { evictNotificationsCache } from './cache';

/**
 * Standalone mark-read mutation for consumers (e.g. the notification bell's preview
 * list) that manage their own local notification state instead of the full
 * `useNotifications` list hook.
 */
export function useMarkNotificationRead() {
  const [markRead] = useMutation<MarkMyNotificationReadMutation>(MarkMyNotificationReadDocument, {
    update: (cache) => {
      evictNotificationsCache(cache);
    },
  });

  return markRead;
}
