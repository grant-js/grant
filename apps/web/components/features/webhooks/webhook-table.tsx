'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { WebhookSubscription } from '@grantjs/schema';
import { Webhook } from 'lucide-react';

import {
  CopyToClipboard,
  DataTable,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { useScopeFromParams } from '@/hooks/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { WebhookActiveStatusLabel } from './webhook-active-status-label';
import { WebhookAudit } from './webhook-audit';
import { WebhookCreateDialog } from './webhook-create-dialog';
import { WebhookNavigationButton } from './webhook-navigation-button';
import { WebhookSubscriptionActions } from './webhook-subscription-actions';

export function WebhookTable() {
  const t = useTranslations('webhooks');
  const scope = useScopeFromParams();
  const subscriptions = useWebhooksStore((state) => state.subscriptions);
  const loading = useWebhooksStore((state) => state.loading);
  const limit = useWebhooksStore((state) => state.limit);

  const columns: DataTableColumnConfig<WebhookSubscription>[] = useMemo(
    () => [
      {
        key: 'description',
        header: t('createDialog.descriptionLabel'),
        width: '200px',
        className: 'pl-4',
        render: (subscription) => (
          <span className="text-sm font-medium">
            {subscription.description || t('subscriptions.noDescription')}
          </span>
        ),
      },
      {
        key: 'url',
        header: t('subscriptions.columns.url'),
        width: '280px',
        columnWidthMode: 'min',
        render: (subscription) => (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs truncate">{subscription.url}</span>
            <CopyToClipboard text={subscription.url} size="sm" variant="ghost" />
          </div>
        ),
      },
      {
        key: 'status',
        header: t('table.status'),
        width: '120px',
        render: (subscription) => <WebhookActiveStatusLabel active={subscription.active} />,
      },
      {
        key: 'events',
        header: t('subscriptions.columns.events'),
        width: '120px',
        render: (subscription) => (
          <Badge variant="secondary">
            {t('eventCount', { count: subscription.eventTypes.length })}
          </Badge>
        ),
      },
      {
        key: 'audit',
        header: t('table.audit'),
        width: '200px',
        render: (subscription) => <WebhookAudit subscription={subscription} />,
      },
      {
        key: 'navigation',
        header: '',
        width: '60px',
        render: (subscription) => (
          <WebhookNavigationButton
            subscriptionId={subscription.id}
            ariaLabel={t('actions.view')}
            size="sm"
          />
        ),
      },
    ],
    [t]
  );

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = useMemo(
    () => ({
      columns: [
        { key: 'description', type: 'text' },
        { key: 'url', type: 'text' },
        { key: 'status', type: 'text' },
        { key: 'events', type: 'text' },
        { key: 'audit', type: 'audit' },
        { key: 'navigation', type: 'icon' },
      ],
      rowCount: limit,
    }),
    [limit]
  );

  if (!scope) {
    return null;
  }

  return (
    <DataTable
      data={subscriptions}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Webhook />,
        title: t('subscriptions.empty'),
        description: t('subscriptions.emptyDescription'),
        action: <WebhookCreateDialog triggerAlwaysShowLabel />,
      }}
      actionsColumn={{
        render: (subscription) => (
          <WebhookSubscriptionActions subscription={subscription} scope={scope} />
        ),
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
