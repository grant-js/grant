'use client';

import { useParams } from 'next/navigation';

import { Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscription } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookSubscriptionActions } from '../webhooks/webhook-subscription-actions';

export function WebhookDetailToolbar() {
  const scope = useScopeFromParams();
  const params = useParams();
  const subscriptionId = params.subscriptionId as string;
  const currentSubscription = useWebhooksStore((state) => state.currentSubscription);

  useWebhookSubscription({
    scope,
    subscriptionId,
  });

  if (!scope || !currentSubscription) {
    return null;
  }

  return (
    <Toolbar
      alwaysRow
      items={[
        <WebhookSubscriptionActions
          key="actions"
          subscription={currentSubscription}
          scope={scope}
        />,
      ]}
    />
  );
}
