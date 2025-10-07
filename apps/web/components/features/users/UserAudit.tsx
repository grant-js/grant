'use client';

import { User } from '@logusgraphics/grant-schema';
import { Fingerprint, Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common/Audit';
import { formatTimestamp } from '@/lib/utils';

interface UserAuditProps {
  user: User;
  className?: string;
}

export function UserAudit({ user, className }: UserAuditProps) {
  const t = useTranslations('common.audit');

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
