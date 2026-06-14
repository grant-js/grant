'use client';

import { useTranslations } from 'next-intl';
import { ProjectSyncJob } from '@grantjs/schema';
import { Activity, FileJson } from 'lucide-react';

import { CardBody, CardGrid, CardHeader } from '@/components/common';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

import { ProjectSyncJobActions } from './project-sync-job-actions';
import { ProjectSyncJobAudit } from './project-sync-job-audit';
import { ProjectSyncJobCardSkeleton } from './project-sync-job-card-skeleton';
import { getJobAvatarInitial, getOperationLabelKey } from './project-sync-job-display';
import { ProjectSyncJobExportTrigger } from './project-sync-job-export-trigger';
import { ProjectSyncJobModeBadge } from './project-sync-job-mode-badge';
import { ProjectSyncJobNavigationButton } from './project-sync-job-navigation-button';
import { ProjectSyncJobStartTrigger } from './project-sync-job-start-trigger';
import { ProjectSyncJobStatusBadge } from './project-sync-job-status-badge';
import {
  ProjectSyncJobsModuleIcon,
  ProjectSyncJobsModuleIconElement,
} from './project-sync-jobs-icon';

export function ProjectSyncJobCards() {
  const t = useTranslations('projectSyncJobs');
  const limit = useProjectSyncJobsStore((state) => state.limit);
  const search = useProjectSyncJobsStore((state) => state.search);
  const status = useProjectSyncJobsStore((state) => state.status);
  const jobs = useProjectSyncJobsStore((state) => state.jobs);
  const loading = useProjectSyncJobsStore((state) => state.loading);
  const isFiltered = !!search || status !== null;

  return (
    <CardGrid<ProjectSyncJob>
      entities={jobs}
      loading={loading}
      emptyState={{
        icon: <ProjectSyncJobsModuleIconElement />,
        title: isFiltered ? t('noResults.title') : t('empty.title'),
        description: isFiltered ? t('noResults.description') : t('empty.description'),
        action: isFiltered ? undefined : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ProjectSyncJobStartTrigger />
            <ProjectSyncJobExportTrigger />
          </div>
        ),
      }}
      skeleton={{
        component: <ProjectSyncJobCardSkeleton />,
        count: limit,
      }}
      renderHeader={(job) => (
        <CardHeader
          avatar={{ initial: getJobAvatarInitial(job), size: 'lg' }}
          title={job.jobName ?? t('table.noJobName')}
          description={t(getOperationLabelKey(job.operation))}
          actions={<ProjectSyncJobActions job={job} />}
        />
      )}
      renderBody={(job) => (
        <CardBody
          items={[
            {
              label: {
                icon: <Activity className="h-3 w-3" />,
                text: t('table.status'),
              },
              value: <ProjectSyncJobStatusBadge status={job.status} />,
            },
            {
              label: {
                icon: <ProjectSyncJobsModuleIcon className="h-3 w-3" />,
                text: t('table.mode'),
              },
              value: <ProjectSyncJobModeBadge job={job} />,
            },
            {
              label: {
                icon: <FileJson className="h-3 w-3" />,
                text: t('table.cdmVersion'),
              },
              value: <span className="text-sm">v{job.cdmVersion}</span>,
            },
          ]}
        />
      )}
      renderFooter={(job) => (
        <div className="flex w-full items-center justify-between gap-2">
          <ProjectSyncJobAudit job={job} />
          <ProjectSyncJobNavigationButton
            projectId={job.projectId}
            jobId={job.id}
            ariaLabel={t('actions.view')}
            size="lg"
          />
        </div>
      )}
    />
  );
}
