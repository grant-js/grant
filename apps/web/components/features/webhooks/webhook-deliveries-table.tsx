'use client';

import type { Scope, WebhookDeliveryStatus } from '@grantjs/schema';
import { RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { useWebhookDeliveries } from '@/hooks/webhooks';

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

interface WebhookDeliveriesTableProps {
  scope: Scope;
  subscriptionId: string;
}

export function WebhookDeliveriesTable({ scope, subscriptionId }: WebhookDeliveriesTableProps) {
  const { deliveries, loading, error, replay } = useWebhookDeliveries({
    scope,
    subscriptionId,
    limit: 20,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  if (deliveries.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No deliveries yet.</p>;
  }

  const handleReplay = async (deliveryId: string) => {
    try {
      await replay(deliveryId);
      toast.success('Delivery re-queued');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to replay delivery');
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Last response</TableHead>
          <TableHead>Next retry</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveries.map((delivery) => (
          <TableRow key={delivery.id}>
            <TableCell>
              <Badge variant={STATUS_VARIANT[delivery.status]}>{delivery.status}</Badge>
            </TableCell>
            <TableCell>{delivery.attemptCount}</TableCell>
            <TableCell>{delivery.lastResponseStatus ?? '—'}</TableCell>
            <TableCell className="text-xs">
              {delivery.nextRetryAt ? new Date(delivery.nextRetryAt).toLocaleString() : '—'}
            </TableCell>
            <TableCell className="text-right">
              {(delivery.status === 'dead' || delivery.status === 'failed') && (
                <Button variant="outline" size="sm" onClick={() => handleReplay(delivery.id)}>
                  <RotateCcw className="size-4" /> Replay
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
