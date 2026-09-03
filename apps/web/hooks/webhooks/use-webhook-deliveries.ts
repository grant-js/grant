import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ReplayWebhookDeliveryDocument,
  type ReplayWebhookDeliveryMutation,
  Scope,
  WebhookDeliveriesDocument,
  type WebhookDeliveriesQuery,
  type WebhookDeliveryAttempt,
  WebhookDeliveryStatus,
} from '@grantjs/schema';

import { evictWebhooksCache } from './cache';

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

function toDeliveryStatus(status?: string): WebhookDeliveryStatus | undefined {
  if (!status) return undefined;
  const values = Object.values(WebhookDeliveryStatus) as string[];
  return values.includes(status) ? (status as WebhookDeliveryStatus) : undefined;
}

export function useWebhookDeliveries(
  params: UseWebhookDeliveriesParams
): UseWebhookDeliveriesResult {
  const { scope, subscriptionId, status, page, limit } = params;

  const skip = useMemo(() => !scope?.id || !scope?.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope: scope!,
      subscriptionId,
      status: toDeliveryStatus(status),
      page,
      limit,
    }),
    [scope, subscriptionId, status, page, limit]
  );

  const { data, loading, error, refetch } = useQuery<WebhookDeliveriesQuery>(
    WebhookDeliveriesDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const [replayMutation] = useMutation<ReplayWebhookDeliveryMutation>(
    ReplayWebhookDeliveryDocument,
    {
      update: (cache) => {
        evictWebhooksCache(cache);
      },
    }
  );

  const replay = useCallback(
    async (deliveryId: string) => {
      if (!scope) throw new Error('Scope is required');
      await replayMutation({
        variables: {
          input: { deliveryId, scope },
        },
      });
      if (!skip) {
        await refetch(variables);
      }
    },
    [scope, replayMutation, refetch, skip, variables]
  );

  /**
   * Both of these are referentially stable, and that is load-bearing rather than tidy.
   *
   * `WebhookDeliveriesViewer` uses each one as a `useEffect` dependency whose body
   * writes into `useWebhookDeliveriesStore`. A fresh identity per render therefore
   * re-fires the effect on every render, the store update re-renders
   * `WebhookDeliveriesCard`, and the card re-renders the viewer — an unbounded loop
   * that React ends with error #185 ("maximum update depth exceeded"), taking the
   * whole page down through the global error boundary.
   *
   * `?? []` was the subtler half: it allocates a new array on every render where the
   * query has no data yet, which is every render during the initial load.
   *
   * `use-webhook-subscriptions-list.ts` already memoizes its list for the same reason.
   */
  const deliveries = useMemo(
    () => data?.webhookDeliveries?.items ?? [],
    [data?.webhookDeliveries?.items]
  );

  const refetchDeliveries = useCallback(async () => {
    if (skip) return;
    await refetch(variables);
  }, [skip, refetch, variables]);

  return {
    deliveries,
    totalCount: data?.webhookDeliveries?.totalCount ?? 0,
    hasNextPage: data?.webhookDeliveries?.hasNextPage ?? false,
    loading,
    error: error ?? null,
    refetch: refetchDeliveries,
    replay,
  };
}
