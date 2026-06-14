'use client';

import { type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectSyncJob, ProjectSyncJobOperation } from '@grantjs/schema';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Archive,
  Calendar,
  FileJson,
  Fingerprint,
  Hash,
  Loader2,
  Settings2,
} from 'lucide-react';

import { CopyToClipboard, EntityDetailInfoTable, FeatureModuleCard } from '@/components/common';
import { formatTimestamp } from '@/lib/utils';

import { ProjectSyncJobConfirmDestructiveBadge } from './project-sync-job-confirm-destructive-badge';
import { ProjectSyncJobModeBadge } from './project-sync-job-mode-badge';
import { ProjectSyncJobOperationBadge } from './project-sync-job-operation-badge';
import { ProjectSyncJobStatusBadge } from './project-sync-job-status-badge';

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface ProjectSyncJobGeneralCardProps {
  job: ProjectSyncJob;
  polling?: boolean;
  confirmDestructive?: boolean | null;
}

export function ProjectSyncJobGeneralCard({
  job,
  polling,
  confirmDestructive,
}: ProjectSyncJobGeneralCardProps) {
  const t = useTranslations('projectSyncJobs.detail');
  const tFields = useTranslations('projectSyncJobs.viewDialog.fields');
  const tSnapshot = useTranslations('projectSyncJobs.viewDialog.snapshot');

  const infoRows = useMemo(() => {
    const isExportJob = job.operation === ProjectSyncJobOperation.Export;
    const rows = [
      {
        id: 'status',
        icon: detailInfoTableIcon(Settings2),
        label: tFields('status'),
        value: (
          <div className="flex items-center gap-2">
            <ProjectSyncJobStatusBadge status={job.status} />
            {polling && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('polling')}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'jobId',
        icon: detailInfoTableIcon(Fingerprint),
        label: tFields('jobId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-mono text-sm">{job.id}</span>
            <CopyToClipboard text={job.id} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ),
      },
      {
        id: 'jobName',
        icon: detailInfoTableIcon(Hash),
        label: tFields('jobName'),
        value: job.jobName ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-mono text-sm">{job.jobName}</span>
            <CopyToClipboard text={job.jobName} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ) : (
          <span className="text-muted-foreground">{tFields('notSet')}</span>
        ),
      },
      {
        id: 'operation',
        icon: detailInfoTableIcon(FileJson),
        label: tFields('operation'),
        value: <ProjectSyncJobOperationBadge operation={job.operation} />,
      },
      {
        id: 'mode',
        icon: detailInfoTableIcon(Settings2),
        label: tFields('mode'),
        value: <ProjectSyncJobModeBadge job={job} />,
      },
    ];

    if (confirmDestructive !== undefined && confirmDestructive !== null) {
      rows.push({
        id: 'confirmDestructive',
        icon: detailInfoTableIcon(Settings2),
        label: tFields('confirmDestructive'),
        value: <ProjectSyncJobConfirmDestructiveBadge confirmed={confirmDestructive} />,
      });
    }

    rows.push(
      {
        id: 'cdmVersion',
        icon: detailInfoTableIcon(FileJson),
        label: tFields('cdmVersion'),
        value: <span className="text-sm">v{job.cdmVersion}</span>,
      },
      {
        id: 'enqueuedAt',
        icon: detailInfoTableIcon(Calendar),
        label: tFields('enqueuedAt'),
        value: <span className="text-sm">{formatTimestamp(job.enqueuedAt)}</span>,
      },
      {
        id: 'startedAt',
        icon: detailInfoTableIcon(Calendar),
        label: tFields('startedAt'),
        value: (
          <span className="text-sm">
            {job.startedAt ? formatTimestamp(job.startedAt) : tFields('notSet')}
          </span>
        ),
      },
      {
        id: 'completedAt',
        icon: detailInfoTableIcon(Calendar),
        label: tFields('completedAt'),
        value: (
          <span className="text-sm">
            {job.completedAt ? formatTimestamp(job.completedAt) : tFields('notSet')}
          </span>
        ),
      }
    );

    if (job.cancelledAt) {
      rows.push({
        id: 'cancelledAt',
        icon: detailInfoTableIcon(Calendar),
        label: tFields('cancelledAt'),
        value: <span className="text-sm">{formatTimestamp(job.cancelledAt)}</span>,
      });
    }

    if (job.hasSnapshot) {
      rows.push({
        id: 'snapshotCaptured',
        icon: detailInfoTableIcon(Archive),
        label: isExportJob ? tFields('exportedCdm') : tFields('rollbackSnapshot'),
        value: (
          <span className="text-sm">
            {isExportJob
              ? job.snapshotTakenAt
                ? tSnapshot('exportTakenAt', { time: formatTimestamp(job.snapshotTakenAt) })
                : tSnapshot('exportSummary')
              : job.snapshotTakenAt
                ? tSnapshot('takenAt', { time: formatTimestamp(job.snapshotTakenAt) })
                : tSnapshot('summary')}
          </span>
        ),
      });
    }

    return rows;
  }, [confirmDestructive, job, polling, t, tFields, tSnapshot]);

  return (
    <FeatureModuleCard
      title={t('general.title')}
      description={t('general.description')}
      collapsible
    >
      <EntityDetailInfoTable
        rows={infoRows}
        fieldColumnHeader={t('tableField')}
        valueColumnHeader={t('tableValue')}
        withTopSeparator={false}
      />

      {job.errorMessage && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">{tFields('errorMessage')}</p>
              <p className="break-words">{job.errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </FeatureModuleCard>
  );
}
