'use client';

import { Fingerprint, Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common/Audit';
import { Group } from '@/graphql/generated/types';

interface GroupAuditProps {
  group: Group;
  className?: string;
}

export function GroupAudit({ group, className }: GroupAuditProps) {
  const t = useTranslations('common.audit');

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (group: Group) => group.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (group: Group) => formatTimestamp(group.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (group: Group) => formatTimestamp(group.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={group} className={className} />;
}
