import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Scope,
  WebhookSubscription,
  WebhookSubscriptionDocument,
  type WebhookSubscriptionQuery,
} from '@grantjs/schema';

interface UseWebhookSubscriptionParams {
  scope: Scope | null | undefined;
  subscriptionId: string | null | undefined;
}

interface UseWebhookSubscriptionResult {
  subscription: WebhookSubscription | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWebhookSubscription(
  params: UseWebhookSubscriptionParams
): UseWebhookSubscriptionResult {
  const { scope, subscriptionId } = params;

  const skip = useMemo(
    () => !scope?.id || !scope?.tenant || !subscriptionId,
    [scope, subscriptionId]
  );

  const variables = useMemo(
    () => ({
      scope: scope!,
      id: subscriptionId!,
    }),
    [scope, subscriptionId]
  );

  const { data, loading, error, refetch } = useQuery<WebhookSubscriptionQuery>(
    WebhookSubscriptionDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  return {
    subscription: data?.webhookSubscription ?? null,
    loading,
    error: error ?? null,
    refetch: async () => {
      if (skip) return;
      await refetch(variables);
    },
  };
}
