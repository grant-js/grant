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
  error: Error | null;
  refetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(options?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
  /** Poll interval in ms (0 disables polling). */
  pollIntervalMs?: number;
}): UseNotificationsResult {
  const { unreadOnly, page, limit, pollIntervalMs = 0 } = options ?? {};
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications({ unreadOnly, page, limit });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(() => void refetch(), pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs, refetch]);

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
    error,
    refetch,
    markRead,
    markAllRead,
  };
}
