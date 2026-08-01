import { useCallback, useEffect, useState } from 'react';
import type { Scope, WebhookSubscription } from '@grantjs/schema';

import { getWebhookSubscription } from '@/lib/webhooks-api.lib';

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
  const [subscription, setSubscription] = useState<WebhookSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!scope?.id || !scope.tenant || !subscriptionId) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSubscription(await getWebhookSubscription(scope, subscriptionId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scope, subscriptionId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { subscription, loading, error, refetch };
}
