'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Scope } from '@grantjs/schema';

import { FeatureModuleCard, RefreshButton, Toolbar } from '@/components/common';
import { useWebhookDeliveriesStore } from '@/stores/webhook-deliveries.store';

import { WebhookDeliveriesPagination } from './webhook-deliveries-pagination';
import { WebhookDeliveriesViewer } from './webhook-deliveries-viewer';

interface WebhookDeliveriesCardProps {
  scope: Scope;
  subscriptionId: string;
}

export function WebhookDeliveriesCard({ scope, subscriptionId }: WebhookDeliveriesCardProps) {
  const t = useTranslations('webhooks');
  const refetch = useWebhookDeliveriesStore((state) => state.refetch);
  const loading = useWebhookDeliveriesStore((state) => state.loading);
  const totalCount = useWebhookDeliveriesStore((state) => state.totalCount);
  const limit = useWebhookDeliveriesStore((state) => state.limit);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const handleRefresh = useCallback(() => {
    refetch?.();
  }, [refetch]);

  return (
    <FeatureModuleCard
      title={t('subscriptions.deliveriesTitle')}
      description={t('detail.deliveries.description')}
      collapsible
      toolbar={
        <Toolbar
          alwaysRow
          items={[
            <RefreshButton key="refresh" onRefresh={handleRefresh} loading={loading} iconOnly />,
          ]}
        />
      }
      footer={totalPages > 1 ? <WebhookDeliveriesPagination /> : undefined}
    >
      <WebhookDeliveriesViewer scope={scope} subscriptionId={subscriptionId} />
    </FeatureModuleCard>
  );
}
