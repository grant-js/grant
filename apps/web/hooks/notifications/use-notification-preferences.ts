import { useCallback, useEffect, useState } from 'react';
import type { NotificationPreference, SetNotificationPreferenceInput } from '@grantjs/schema';

import {
  listNotificationPreferences,
  setNotificationPreference,
} from '@/lib/notifications-api.lib';

interface UseNotificationPreferencesResult {
  preferences: NotificationPreference[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setPreference: (input: SetNotificationPreferenceInput) => Promise<void>;
}

export function useNotificationPreferences(
  scopeTenant: string | null | undefined
): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!scopeTenant) return;
    setLoading(true);
    setError(null);
    try {
      setPreferences(await listNotificationPreferences(scopeTenant));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scopeTenant]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const setPreference = useCallback(
    async (input: SetNotificationPreferenceInput) => {
      await setNotificationPreference(input);
      await refetch();
    },
    [refetch]
  );

  return { preferences, loading, error, refetch, setPreference };
}
