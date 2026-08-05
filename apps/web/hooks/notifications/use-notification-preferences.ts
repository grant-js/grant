import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  MyNotificationPreferencesDocument,
  type MyNotificationPreferencesQuery,
  type NotificationPreference,
  SetMyNotificationPreferenceDocument,
  type SetMyNotificationPreferenceMutation,
  type SetNotificationPreferenceInput,
} from '@grantjs/schema';

import { evictNotificationPreferencesCache } from './cache';

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
  const skip = !scopeTenant;

  const variables = useMemo(() => ({ scopeTenant: scopeTenant! }), [scopeTenant]);

  const { data, loading, error, refetch } = useQuery<MyNotificationPreferencesQuery>(
    MyNotificationPreferencesDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const [setPreferenceMutation] = useMutation<SetMyNotificationPreferenceMutation>(
    SetMyNotificationPreferenceDocument,
    {
      update: (cache) => {
        evictNotificationPreferencesCache(cache);
      },
    }
  );

  const setPreference = useCallback(
    async (input: SetNotificationPreferenceInput) => {
      await setPreferenceMutation({ variables: { input } });
      if (!skip) {
        await refetch(variables);
      }
    },
    [setPreferenceMutation, refetch, skip, variables]
  );

  return {
    preferences: data?.myNotificationPreferences ?? [],
    loading: skip ? false : loading,
    error: error ?? null,
    refetch: async () => {
      if (skip) return;
      await refetch(variables);
    },
    setPreference,
  };
}
