'use client';

import { Fingerprint, Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common/Audit';
import { User } from '@/graphql/generated/types';

interface UserAuditProps {
  user: User;
  className?: string;
}

export function UserAudit({ user, className }: UserAuditProps) {
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
      getValue: (user: User) => user.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (user: User) => formatTimestamp(user.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (user: User) => formatTimestamp(user.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={user} className={className} />;
}
