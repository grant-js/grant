import { useCallback, useEffect, useState } from 'react';
import type { Scope, WebhookDeliveryAttempt } from '@grantjs/schema';

import { listWebhookDeliveries, replayWebhookDelivery } from '@/lib/webhooks-api.lib';

interface UseWebhookDeliveriesParams {
  scope: Scope | null | undefined;
  subscriptionId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface UseWebhookDeliveriesResult {
  deliveries: WebhookDeliveryAttempt[];
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  replay: (deliveryId: string) => Promise<void>;
}

export function useWebhookDeliveries(
  params: UseWebhookDeliveriesParams
): UseWebhookDeliveriesResult {
  const { scope, subscriptionId, status, page, limit } = params;
  const [deliveries, setDeliveries] = useState<WebhookDeliveryAttempt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!scope?.id || !scope.tenant) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listWebhookDeliveries(scope, { subscriptionId, status, page, limit });
      setDeliveries(result.items);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scope, subscriptionId, status, page, limit]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const replay = useCallback(
    async (deliveryId: string) => {
      if (!scope) throw new Error('Scope is required');
      await replayWebhookDelivery(scope, deliveryId);
      await refetch();
    },
    [scope, refetch]
  );

  return { deliveries, totalCount, hasNextPage, loading, error, refetch, replay };
}
