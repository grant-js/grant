'use client';

import { useTranslations } from 'next-intl';
import { ProjectSyncJob } from '@grantjs/schema';
import { TriangleAlert } from 'lucide-react';

import { FeatureModuleCard } from '@/components/common';

import { PROJECT_SYNC_JOB_SCROLLABLE_CARD_BODY_CLASS } from './project-sync-job-display';

interface ProjectSyncJobWarningsCardProps {
  job: ProjectSyncJob;
}

export function ProjectSyncJobWarningsCard({ job }: ProjectSyncJobWarningsCardProps) {
  const t = useTranslations('projectSyncJobs.detail');

  const warnings = job.warnings ?? [];
  if (warnings.length === 0) {
    return null;
  }

  return (
    <FeatureModuleCard
      title={t('warnings.title', { count: warnings.length })}
      description={t('warnings.description')}
      titleAdornment={<TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />}
      collapsible
      defaultExpanded={false}
      contentClassName={PROJECT_SYNC_JOB_SCROLLABLE_CARD_BODY_CLASS}
    >
      <ul className="list-disc space-y-2 pl-5 text-sm text-amber-800 dark:text-amber-200">
        {warnings.map((warning, idx) => (
          <li key={idx} className="break-words">
            {warning}
          </li>
        ))}
      </ul>
    </FeatureModuleCard>
  );
}
