'use client';

import { Permission } from '@grantjs/schema';
import { Calendar, Clock, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

interface PermissionAuditProps {
  permission: Permission;
  className?: string;
}

export function PermissionAudit({ permission, className }: PermissionAuditProps) {
  const t = useTranslations('common.audit');

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (permission: Permission) => permission.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (permission: Permission) => formatTimestamp(permission.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (permission: Permission) => formatTimestamp(permission.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={permission} className={className} />;
}
