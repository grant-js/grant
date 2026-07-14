'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout, FeatureDetailSkeleton } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscription } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookDeliveriesCard } from './webhook-deliveries-card';
import { WebhookEventsCard } from './webhook-events-card';
import { WebhookGeneralCard } from './webhook-general-card';

export function WebhookDetailViewer() {
  const t = useTranslations('webhooks');
  const scope = useScopeFromParams();
  const params = useParams();
  const subscriptionId = params.subscriptionId as string;
  const setCurrentSubscription = useWebhooksStore((state) => state.setCurrentSubscription);

  const { subscription, loading, error, refetch } = useWebhookSubscription({
    scope,
    subscriptionId,
  });

  useEffect(() => {
    setCurrentSubscription(subscription);
    return () => setCurrentSubscription(null);
  }, [subscription, setCurrentSubscription]);

  if (!scope) {
    return null;
  }

  if (loading && !subscription) {
    return (
      <FeatureDetailSkeleton
        cards={[
          { showAvatar: true, showFooter: true, rows: 4 },
          { variant: 'table', rows: 4, showToolbar: true },
          { variant: 'table', rows: 4, showToolbar: true },
        ]}
      />
    );
  }

  if (error || !subscription) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-destructive">{error?.message ?? t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <FeatureDetailLayout>
      <WebhookGeneralCard subscription={subscription} onAfterWebhookMutation={refetch} />
      <WebhookEventsCard subscription={subscription} onAfterWebhookMutation={refetch} />
      <WebhookDeliveriesCard scope={scope} subscriptionId={subscription.id} />
    </FeatureDetailLayout>
  );
}
