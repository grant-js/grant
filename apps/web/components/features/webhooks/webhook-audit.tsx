'use client';

import { useTranslations } from 'next-intl';
import type { WebhookSubscription } from '@grantjs/schema';
import { Calendar, Clock, Fingerprint } from 'lucide-react';

import { Audit, type AuditField } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

interface WebhookAuditProps {
  subscription: WebhookSubscription;
  className?: string;
}

export function WebhookAudit({ subscription, className }: WebhookAuditProps) {
  const t = useTranslations('common.audit');

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (item: WebhookSubscription) => item.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (item: WebhookSubscription) => formatTimestamp(item.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (item: WebhookSubscription) => formatTimestamp(item.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={subscription} className={className} />;
}
