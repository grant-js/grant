'use client';

import { Project } from '@grantjs/schema';
import { Calendar, Clock, Fingerprint } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Audit, type AuditField } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

interface ProjectAuditProps {
  project: Project;
  className?: string;
}

export function ProjectAudit({ project, className }: ProjectAuditProps) {
  const t = useTranslations('common.audit');

  const auditFields: AuditField[] = [
    {
      key: 'id',
      icon: <Fingerprint className="h-3 w-3" />,
      label: t('id'),
      getValue: (project: Project) => project.id,
    },
    {
      key: 'createdAt',
      icon: <Calendar className="h-3 w-3" />,
      label: t('created'),
      getValue: (project: Project) => formatTimestamp(project.createdAt),
    },
    {
      key: 'updatedAt',
      icon: <Clock className="h-3 w-3" />,
      label: t('updated'),
      getValue: (project: Project) => formatTimestamp(project.updatedAt),
    },
  ];

  return <Audit fields={auditFields} item={project} className={className} />;
}
