'use client';

import { useCallback, useEffect } from 'react';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionsList } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookCards } from './webhook-cards';
import { WebhookTable } from './webhook-table';

export function WebhookSubscriptionViewer() {
  const scope = useScopeFromParams();
  const view = useWebhooksStore((state) => state.view);
  const page = useWebhooksStore((state) => state.page);
  const limit = useWebhooksStore((state) => state.limit);
  const search = useWebhooksStore((state) => state.search);
  const sort = useWebhooksStore((state) => state.sort);
  const setTotalCount = useWebhooksStore((state) => state.setTotalCount);
  const setSubscriptions = useWebhooksStore((state) => state.setSubscriptions);
  const setLoading = useWebhooksStore((state) => state.setLoading);
  const setRefetch = useWebhooksStore((state) => state.setRefetch);

  const { subscriptions, totalCount, loading, error, refetch } = useWebhookSubscriptionsList({
    scope,
    page,
    limit,
    search,
    sort,
  });

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setSubscriptions(subscriptions);
  }, [subscriptions, setSubscriptions]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setTotalCount(totalCount);
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Project, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-destructive">{error.message}</p>
      </div>
    );
  }

  return view === 'card' ? <WebhookCards /> : <WebhookTable />;
}
