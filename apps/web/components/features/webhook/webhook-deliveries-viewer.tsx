'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Scope, WebhookDeliveryAttempt, WebhookDeliveryStatus } from '@grantjs/schema';
import { RotateCcw, Webhook } from 'lucide-react';

import { DataTable, type DataTableColumnConfig } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useWebhookDeliveries } from '@/hooks/webhooks';
import { useWebhookDeliveriesStore } from '@/stores/webhook-deliveries.store';

const STATUS_VARIANT: Record<
  WebhookDeliveryStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  running: 'secondary',
  delivered: 'default',
  failed: 'destructive',
  dead: 'destructive',
};

interface WebhookDeliveriesViewerProps {
  scope: Scope;
  subscriptionId: string;
}

export function WebhookDeliveriesViewer({ scope, subscriptionId }: WebhookDeliveriesViewerProps) {
  const t = useTranslations('webhooks.deliveries');
  const page = useWebhookDeliveriesStore((state) => state.page);
  const limit = useWebhookDeliveriesStore((state) => state.limit);
  const setTotalCount = useWebhookDeliveriesStore((state) => state.setTotalCount);
  const setDeliveries = useWebhookDeliveriesStore((state) => state.setDeliveries);
  const setLoading = useWebhookDeliveriesStore((state) => state.setLoading);
  const setRefetch = useWebhookDeliveriesStore((state) => state.setRefetch);

  const { deliveries, totalCount, loading, error, refetch, replay } = useWebhookDeliveries({
    scope,
    subscriptionId,
    page,
    limit,
  });

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setDeliveries(deliveries);
  }, [deliveries, setDeliveries]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    setTotalCount(totalCount);
  }, [totalCount, setTotalCount]);

  const handleReplay = async (deliveryId: string) => {
    try {
      await replay(deliveryId);
      toast.success(t('replaySuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('replayError'));
    }
  };

  const columns: DataTableColumnConfig<WebhookDeliveryAttempt>[] = useMemo(
    () => [
      {
        key: 'status',
        header: t('columns.status'),
        width: '120px',
        render: (delivery) => (
          <Badge variant={STATUS_VARIANT[delivery.status]}>{delivery.status}</Badge>
        ),
      },
      {
        key: 'attempts',
        header: t('columns.attempts'),
        width: '100px',
        render: (delivery) => delivery.attemptCount,
      },
      {
        key: 'lastResponse',
        header: t('columns.lastResponse'),
        width: '120px',
        render: (delivery) => delivery.lastResponseStatus ?? '—',
      },
      {
        key: 'nextRetry',
        header: t('columns.nextRetry'),
        width: '180px',
        render: (delivery) =>
          delivery.nextRetryAt ? new Date(delivery.nextRetryAt).toLocaleString() : '—',
      },
      {
        key: 'createdAt',
        header: t('columns.createdAt'),
        width: '180px',
        render: (delivery) => new Date(delivery.createdAt).toLocaleString(),
      },
    ],
    [t]
  );

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  return (
    <DataTable
      data={deliveries}
      columns={columns}
      loading={loading}
      emptyState={{
        icon: <Webhook />,
        title: t('empty'),
        description: t('emptyHint'),
      }}
      actionsColumn={{
        render: (delivery) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReplay(delivery.id)}
            title={t('replay')}
          >
            <RotateCcw className="size-4" />
          </Button>
        ),
      }}
      skeletonConfig={{
        columns: [
          { key: 'status', type: 'text' },
          { key: 'attempts', type: 'text' },
          { key: 'lastResponse', type: 'text' },
          { key: 'nextRetry', type: 'text' },
          { key: 'createdAt', type: 'text' },
        ],
        rowCount: 5,
      }}
    />
  );
}
