'use client';

import { useTranslations } from 'next-intl';
import { ProjectSyncJob } from '@grantjs/schema';

import {
  Avatar,
  DataTable,
  type DataTableColumnConfig,
  type TableSkeletonColumnConfig,
} from '@/components/common';
import { formatTimestamp } from '@/lib/utils';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

import { ProjectSyncJobActions } from './project-sync-job-actions';
import { getJobAvatarInitial } from './project-sync-job-display';
import { ProjectSyncJobExportTrigger } from './project-sync-job-export-trigger';
import { ProjectSyncJobModeBadge } from './project-sync-job-mode-badge';
import { ProjectSyncJobNavigationButton } from './project-sync-job-navigation-button';
import { ProjectSyncJobOperationBadge } from './project-sync-job-operation-badge';
import { ProjectSyncJobStartTrigger } from './project-sync-job-start-trigger';
import { ProjectSyncJobStatusBadge } from './project-sync-job-status-badge';
import { ProjectSyncJobsModuleIconElement } from './project-sync-jobs-icon';

export function ProjectSyncJobTable() {
  const t = useTranslations('projectSyncJobs');
  const limit = useProjectSyncJobsStore((state) => state.limit);
  const search = useProjectSyncJobsStore((state) => state.search);
  const status = useProjectSyncJobsStore((state) => state.status);
  const jobs = useProjectSyncJobsStore((state) => state.jobs);
  const loading = useProjectSyncJobsStore((state) => state.loading);
  const columns: DataTableColumnConfig<ProjectSyncJob>[] = [
    {
      key: 'avatar',
      header: '',
      width: '60px',
      className: 'pl-4',
      render: (job) => <Avatar initial={getJobAvatarInitial(job)} size="md" />,
    },
    {
      key: 'jobName',
      header: t('table.jobName'),
      width: '240px',
      className: 'whitespace-normal',
      render: (job) =>
        job.jobName ? (
          <span className="block truncate text-sm font-mono" title={job.jobName}>
            {job.jobName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t('table.noJobName')}</span>
        ),
    },
    {
      key: 'operation',
      header: t('table.operation'),
      width: '100px',
      render: (job) => <ProjectSyncJobOperationBadge operation={job.operation} />,
    },
    {
      key: 'modeStrategy',
      header: t('table.mode'),
      width: '110px',
      render: (job) => <ProjectSyncJobModeBadge job={job} />,
    },
    {
      key: 'cdmVersion',
      header: t('table.cdmVersion'),
      width: '110px',
      render: (job) => <span className="text-sm">v{job.cdmVersion}</span>,
    },
    {
      key: 'status',
      header: t('table.status'),
      width: '140px',
      render: (job) => <ProjectSyncJobStatusBadge status={job.status} />,
    },
    {
      key: 'enqueuedAt',
      header: t('table.enqueuedAt'),
      width: '180px',
      render: (job) => (
        <span className="text-sm text-muted-foreground">{formatTimestamp(job.enqueuedAt)}</span>
      ),
    },
    {
      key: 'startedAt',
      header: t('table.startedAt'),
      width: '180px',
      render: (job) => (
        <span className="text-sm text-muted-foreground">
          {job.startedAt ? formatTimestamp(job.startedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'completedAt',
      header: t('table.completedAt'),
      width: '180px',
      render: (job) => (
        <span className="text-sm text-muted-foreground">
          {job.completedAt ? formatTimestamp(job.completedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'navigation',
      header: '',
      width: '60px',
      render: (job) => (
        <ProjectSyncJobNavigationButton
          projectId={job.projectId}
          jobId={job.id}
          ariaLabel={t('actions.view')}
          size="sm"
        />
      ),
    },
  ];

  const skeletonConfig: { columns: TableSkeletonColumnConfig[]; rowCount?: number } = {
    columns: [
      { key: 'avatar', type: 'avatar' },
      { key: 'jobName', type: 'text' },
      { key: 'operation', type: 'text' },
      { key: 'modeStrategy', type: 'text' },
      { key: 'cdmVersion', type: 'text' },
      { key: 'status', type: 'text' },
      { key: 'enqueuedAt', type: 'text' },
      { key: 'startedAt', type: 'text' },
      { key: 'completedAt', type: 'text' },
      { key: 'navigation', type: 'icon' },
    ],
    rowCount: limit,
  };

  const isFiltered = !!search || status !== null;

  return (
    <DataTable
      data={jobs}
      columns={columns}
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
      actionsColumn={{
        render: (job) => <ProjectSyncJobActions job={job} />,
      }}
      skeletonConfig={skeletonConfig}
    />
  );
}
