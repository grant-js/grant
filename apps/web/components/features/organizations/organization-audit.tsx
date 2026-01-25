'use client';

import { Organization } from '@grantjs/schema';
import { Calendar, Clock, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

interface OrganizationAuditProps {
  organization: Organization;
  className?: string;
}

export function OrganizationAudit({ organization, className }: OrganizationAuditProps) {
  const t = useTranslations('common.audit');

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (organization: Organization) => organization.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (organization: Organization) => formatTimestamp(organization.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (organization: Organization) => formatTimestamp(organization.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={organization} className={className} />;
}
