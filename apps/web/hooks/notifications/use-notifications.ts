import { useCallback, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  MarkAllMyNotificationsReadDocument,
  type MarkAllMyNotificationsReadMutation,
  MarkMyNotificationReadDocument,
  type MarkMyNotificationReadMutation,
  MyNotificationsDocument,
  type MyNotificationsQuery,
  type Notification,
} from '@grantjs/schema';

import { evictNotificationsCache } from './cache';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  /** Poll interval in ms (0 disables polling). */
  pollIntervalMs?: number;
}): UseNotificationsResult {
  const { unreadOnly, limit = 20, pollIntervalMs = 0 } = options ?? {};
  const client = useApolloClient();
  const [page, setPage] = useState(1);
  const [extraNotifications, setExtraNotifications] = useState<Notification[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPageOverride, setHasNextPageOverride] = useState<boolean | null>(null);

  const variables = useMemo(
    () => ({
      input: {
        unreadOnly,
        page: 1,
        limit,
      },
    }),
    [unreadOnly, limit]
  );

  const { data, loading, error, refetch } = useQuery<MyNotificationsQuery>(
    MyNotificationsDocument,
    {
      variables,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      pollInterval: pollIntervalMs > 0 ? pollIntervalMs : undefined,
    }
  );

  const firstPage = useMemo(
    () => data?.myNotifications?.notifications ?? [],
    [data?.myNotifications?.notifications]
  );

  const notifications = useMemo(
    () => (extraNotifications.length > 0 ? [...firstPage, ...extraNotifications] : firstPage),
    [firstPage, extraNotifications]
  );

  const [markReadMutation] = useMutation<MarkMyNotificationReadMutation>(
    MarkMyNotificationReadDocument,
    {
      update: (cache) => {
        evictNotificationsCache(cache);
      },
    }
  );

  const [markAllReadMutation] = useMutation<MarkAllMyNotificationsReadMutation>(
    MarkAllMyNotificationsReadDocument,
    {
      update: (cache) => {
        evictNotificationsCache(cache);
      },
    }
  );

  const handleRefetch = useCallback(async () => {
    setExtraNotifications([]);
    setPage(1);
    setHasNextPageOverride(null);
    await refetch(variables);
  }, [refetch, variables]);

  const loadMore = useCallback(async () => {
    const hasNext = hasNextPageOverride ?? data?.myNotifications?.hasNextPage ?? false;
    if (!hasNext || loadingMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await client.query<MyNotificationsQuery>({
        query: MyNotificationsDocument,
        variables: {
          input: {
            unreadOnly,
            page: nextPage,
            limit,
          },
        },
        fetchPolicy: 'network-only',
      });

      const pageResult = result.data?.myNotifications;
      if (pageResult) {
        setExtraNotifications((prev) => [...prev, ...pageResult.notifications]);
        setPage(nextPage);
        setHasNextPageOverride(pageResult.hasNextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    client,
    data?.myNotifications?.hasNextPage,
    hasNextPageOverride,
    limit,
    loadingMore,
    page,
    unreadOnly,
  ]);

  const markRead = useCallback(
    async (id: string) => {
      await markReadMutation({ variables: { id } });
      await handleRefetch();
    },
    [markReadMutation, handleRefetch]
  );

  const markAllRead = useCallback(async () => {
    await markAllReadMutation();
    await handleRefetch();
  }, [markAllReadMutation, handleRefetch]);

  return {
    notifications,
    unreadCount: data?.myNotifications?.unreadCount ?? 0,
    totalCount: data?.myNotifications?.totalCount ?? 0,
    hasNextPage: hasNextPageOverride ?? data?.myNotifications?.hasNextPage ?? false,
    loading,
    loadingMore,
    error: error ?? null,
    refetch: handleRefetch,
    loadMore,
    markRead,
    markAllRead,
  };
}
