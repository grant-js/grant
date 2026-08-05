'use client';

import { useTranslations } from 'next-intl';
import type { WebhookSubscription } from '@grantjs/schema';
import { Activity, Link2, Plus, Webhook, Zap } from 'lucide-react';

import {
  CardBody,
  CardGrid,
  CardHeader,
  CopyToClipboard,
  EntityCreateNavigateButton,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookActiveStatusLabel } from './webhook-active-status-label';
import { WebhookAudit } from './webhook-audit';
import { WebhookCardSkeleton } from './webhook-card-skeleton';
import { WebhookNavigationButton } from './webhook-navigation-button';
import { WebhookSubscriptionActions } from './webhook-subscription-actions';

export function WebhookCards() {
  const t = useTranslations('webhooks');
  const tCreate = useTranslations('webhooks.createDialog');
  const scope = useScopeFromParams();
  const subscriptions = useWebhooksStore((state) => state.subscriptions);
  const loading = useWebhooksStore((state) => state.loading);
  const search = useWebhooksStore((state) => state.search);
  const limit = useWebhooksStore((state) => state.limit);

  const hasActiveFilters = search.trim() !== '';

  if (!scope) {
    return null;
  }

  return (
    <CardGrid<WebhookSubscription>
      entities={subscriptions}
      loading={loading}
      emptyState={{
        icon: <Webhook />,
        title: t('subscriptions.empty'),
        description: hasActiveFilters ? '' : t('subscriptions.emptyDescription'),
        action: hasActiveFilters ? undefined : (
          <EntityCreateNavigateButton
            entitySegment="webhooks"
            label={tCreate('trigger')}
            icon={Plus}
            alwaysShowLabel
          />
        ),
      }}
      skeleton={{
        component: <WebhookCardSkeleton />,
        count: limit,
      }}
      renderHeader={(subscription) => (
        <CardHeader
          avatar={{
            initial: (subscription.description || 'W').charAt(0).toUpperCase(),
            size: 'lg',
            icon: <Webhook className="h-5 w-5 text-muted-foreground" />,
          }}
          title={subscription.description || t('subscriptions.noDescription')}
          actions={<WebhookSubscriptionActions subscription={subscription} scope={scope} />}
        />
      )}
      renderBody={(subscription) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Link2 className="h-3 w-3" />,
                text: t('subscriptions.columns.url'),
              },
              value: (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-muted-foreground font-mono truncate">
                    {subscription.url}
                  </span>
                  <CopyToClipboard text={subscription.url} size="sm" variant="ghost" />
                </div>
              ),
            },
            {
              label: {
                icon: <Activity className="h-3 w-3" />,
                text: t('table.status'),
              },
              value: <WebhookActiveStatusLabel active={subscription.active} />,
            },
            {
              label: {
                icon: <Zap className="h-3 w-3" />,
                text: t('subscriptions.columns.events'),
              },
              value: (
                <Badge variant="secondary">
                  {t('eventCount', { count: subscription.eventTypes.length })}
                </Badge>
              ),
            },
          ]}
        />
      )}
      renderFooter={(subscription) => (
        <div className="flex items-center justify-between w-full gap-2">
          <WebhookAudit subscription={subscription} />
          <WebhookNavigationButton
            subscriptionId={subscription.id}
            ariaLabel={t('actions.view')}
            size="lg"
          />
        </div>
      )}
    />
  );
}
