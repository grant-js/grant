'use client';

import { useTranslations } from 'next-intl';
import type { WebhookDeliveryStatus } from '@grantjs/schema';

import { cn } from '@/lib/utils';

interface WebhookDeliveryStatusLabelProps {
  status: WebhookDeliveryStatus;
  className?: string;
}

const STATUS_VISUALS: Record<WebhookDeliveryStatus, { className: string; labelKey: string }> = {
  pending: {
    className: 'text-muted-foreground',
    labelKey: 'status.pending',
  },
  running: {
    className: 'text-blue-600 dark:text-blue-500',
    labelKey: 'status.running',
  },
  delivered: {
    className: 'text-green-600 dark:text-green-500',
    labelKey: 'status.delivered',
  },
  failed: {
    className: 'text-destructive',
    labelKey: 'status.failed',
  },
  dead: {
    className: 'text-destructive',
    labelKey: 'status.dead',
  },
};

export function WebhookDeliveryStatusLabel({ status, className }: WebhookDeliveryStatusLabelProps) {
  const t = useTranslations('webhooks.deliveries');
  const visuals = STATUS_VISUALS[status];

  return <span className={cn('text-sm', visuals.className, className)}>{t(visuals.labelKey)}</span>;
}
