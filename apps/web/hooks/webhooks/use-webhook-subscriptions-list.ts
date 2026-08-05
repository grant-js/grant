import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Scope,
  WebhookSubscription,
  WebhookSubscriptionsDocument,
  type WebhookSubscriptionsQuery,
} from '@grantjs/schema';

import type { WebhookSortInput } from '@/components/features/webhooks/webhook-types';
import {
  filterWebhookSubscriptions,
  paginateItems,
  sortWebhookSubscriptions,
} from '@/lib/webhook-subscriptions-list.lib';

interface UseWebhookSubscriptionsListParams {
  scope: Scope | null | undefined;
  page: number;
  limit: number;
  search: string;
  sort: WebhookSortInput;
}

interface UseWebhookSubscriptionsListResult {
  subscriptions: WebhookSubscription[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWebhookSubscriptionsList(
  params: UseWebhookSubscriptionsListParams
): UseWebhookSubscriptionsListResult {
  const { scope, page, limit, search, sort } = params;

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

  const allSubscriptions = useMemo(
    () => data?.webhookSubscriptions ?? [],
    [data?.webhookSubscriptions]
  );

  const filtered = useMemo(
    () => filterWebhookSubscriptions(allSubscriptions, search),
    [allSubscriptions, search]
  );

  const sorted = useMemo(() => sortWebhookSubscriptions(filtered, sort), [filtered, sort]);

  const subscriptions = useMemo(() => paginateItems(sorted, page, limit), [sorted, page, limit]);

  return {
    subscriptions,
    totalCount: sorted.length,
    loading,
    error: error ?? null,
    refetch: async () => {
      if (skip) return;
      await refetch(variables);
    },
  };
}
