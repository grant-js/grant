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

  return {
    deliveries: data?.webhookDeliveries?.items ?? [],
    totalCount: data?.webhookDeliveries?.totalCount ?? 0,
    hasNextPage: data?.webhookDeliveries?.hasNextPage ?? false,
    loading,
    error: error ?? null,
    refetch: async () => {
      if (skip) return;
      await refetch(variables);
    },
    replay,
  };
}
