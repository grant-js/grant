import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  MyUnreadNotificationCountDocument,
  type MyUnreadNotificationCountQuery,
} from '@grantjs/schema';

const DEFAULT_POLL_MS = 30_000;

export function useUnreadNotificationCount(pollIntervalMs = DEFAULT_POLL_MS) {
  const { data, loading, error, refetch } = useQuery<MyUnreadNotificationCountQuery>(
    MyUnreadNotificationCountDocument,
    {
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      pollInterval: pollIntervalMs > 0 ? pollIntervalMs : undefined,
    }
  );

  const unreadCount = useMemo(
    () => data?.myUnreadNotificationCount?.unreadCount ?? 0,
    [data?.myUnreadNotificationCount?.unreadCount]
  );

  return {
    unreadCount,
    loading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
}
