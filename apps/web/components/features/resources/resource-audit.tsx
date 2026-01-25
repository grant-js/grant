'use client';

import { Resource } from '@grantjs/schema';
import { Calendar, Clock, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

interface ResourceAuditProps {
  resource: Resource;
  className?: string;
}

export function ResourceAudit({ resource, className }: ResourceAuditProps) {
  const t = useTranslations('common.audit');

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (resource: Resource) => resource.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (resource: Resource) => formatTimestamp(resource.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (resource: Resource) => formatTimestamp(resource.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={resource} className={className} />;
}
