'use client';

import { Fingerprint, Calendar, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common/Audit';
import { Role } from '@/graphql/generated/types';

interface RoleAuditProps {
  role: Role;
  className?: string;
}

export function RoleAudit({ role, className }: RoleAuditProps) {
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
      getValue: (role: Role) => role.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (role: Role) => formatTimestamp(role.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (role: Role) => formatTimestamp(role.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={role} className={className} />;
}
