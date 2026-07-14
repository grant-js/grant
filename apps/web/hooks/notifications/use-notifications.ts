import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@grantjs/schema';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications-api.lib';

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
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await listNotifications({ unreadOnly, page: pageNum, limit });
        setNotifications((prev) =>
          append ? [...prev, ...result.notifications] : result.notifications
        );
        setUnreadCount(result.unreadCount);
        setTotalCount(result.totalCount);
        setHasNextPage(result.hasNextPage);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [unreadOnly, limit]
  );

  const refetch = useCallback(async () => {
    await fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(() => void refetch(), pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs, refetch]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loadingMore) return;
    await fetchPage(page + 1, true);
  }, [fetchPage, hasNextPage, loadingMore, page]);

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await refetch();
    },
    [refetch]
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await refetch();
  }, [refetch]);

  return {
    notifications,
    unreadCount,
    totalCount,
    hasNextPage,
    loading,
    loadingMore,
    error,
    refetch,
    loadMore,
    markRead,
    markAllRead,
  };
}
