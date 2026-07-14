import { useCallback, useEffect, useState } from 'react';

import { getUnreadNotificationCount } from '@/lib/notifications-api.lib';

const DEFAULT_POLL_MS = 30_000;

export function useUnreadNotificationCount(pollIntervalMs = DEFAULT_POLL_MS) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUnreadNotificationCount();
      setUnreadCount(result.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollIntervalMs) return;
    const interval = setInterval(() => void refetch(), pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs, refetch]);

  return { unreadCount, loading, error, refetch };
}
