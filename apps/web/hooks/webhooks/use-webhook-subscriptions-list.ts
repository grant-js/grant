import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Scope, WebhookSubscription } from '@grantjs/schema';

import type { WebhookSortInput } from '@/components/features/webhooks/webhook-types';
import {
  filterWebhookSubscriptions,
  paginateItems,
  sortWebhookSubscriptions,
} from '@/lib/webhook-subscriptions-list.lib';
import { listWebhookSubscriptions } from '@/lib/webhooks-api.lib';

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
  const [allSubscriptions, setAllSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!scope?.id || !scope.tenant) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAllSubscriptions(await listWebhookSubscriptions(scope));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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
    error,
    refetch,
  };
}
