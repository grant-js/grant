import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Scope,
  WebhookSubscription,
  WebhookSubscriptionsDocument,
  type WebhookSubscriptionsQuery,
} from '@grantjs/schema';

interface UseWebhookSubscriptionsResult {
  subscriptions: WebhookSubscription[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWebhookSubscriptions(
  scope: Scope | null | undefined
): UseWebhookSubscriptionsResult {
  const skip = useMemo(() => !scope?.id || !scope?.tenant, [scope]);
  const variables = useMemo(() => ({ scope: scope! }), [scope]);

  const { data, loading, error, refetch } = useQuery<WebhookSubscriptionsQuery>(
    WebhookSubscriptionsDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  return {
    subscriptions: data?.webhookSubscriptions ?? [],
    loading,
    error: error ?? null,
    refetch: async () => {
      if (skip) return;
      await refetch(variables);
    },
  };
}
