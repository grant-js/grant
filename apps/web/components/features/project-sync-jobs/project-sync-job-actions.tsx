'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectSyncJob, ProjectSyncJobOperation, ProjectSyncJobStatus } from '@grantjs/schema';
import { Ban, Download } from 'lucide-react';

import { type ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectSyncJobPayload, useProjectSyncJobSnapshot } from '@/hooks/projects';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

interface ProjectSyncJobActionsProps {
  job: ProjectSyncJob;
}

const ACTIVE_STATUSES: ReadonlyArray<ProjectSyncJobStatus> = [
  ProjectSyncJobStatus.Pending,
  ProjectSyncJobStatus.Running,
];

export function ProjectSyncJobActions({ job }: ProjectSyncJobActionsProps) {
  const t = useTranslations('projectSyncJobs.actions');
  const scope = useScopeFromParams();

  const setJobToCancel = useProjectSyncJobsStore((state) => state.setJobToCancel);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const projectGrantContext = {
    resource: { id: job.projectId, scope: { projects: [job.projectId] } },
  };

  const { isGranted: canQuery, isLoading: isQueryLoading } = useGrant(
    ResourceSlug.ProjectSyncJob,
    ResourceAction.Query,
    {
      scope: scope!,
      context: projectGrantContext,
      enabled: hasBeenOpened,
      returnLoading: true,
    }
  ) as UseGrantResult;

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.ProjectSyncJob,
    ResourceAction.Update,
    {
      scope: scope!,
      context: projectGrantContext,
      enabled: hasBeenOpened,
      returnLoading: true,
    }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const isExportJob = job.operation === ProjectSyncJobOperation.Export;
  const isCompleted = job.status === ProjectSyncJobStatus.Completed;
  const lazyJobId = hasBeenOpened ? job.id : null;

  const { download: downloadPayload, loading: downloadingPayload } = useProjectSyncJobPayload({
    id: job.projectId,
    scope: scope ?? null,
    jobId: !isExportJob ? lazyJobId : null,
  });

  const { download: downloadExport, loading: downloadingExport } = useProjectSyncJobSnapshot({
    id: job.projectId,
    scope: scope ?? null,
    jobId: isExportJob && isCompleted && job.hasSnapshot ? lazyJobId : null,
    skip: true,
  });

  if (!scope) return null;

  const isActive = ACTIVE_STATUSES.includes(job.status);
  const canCancel = isActive && canUpdate && !requiresEmailVerification;

  const actions: ActionItem<ProjectSyncJob>[] = [];

  if (canQuery) {
    if (isExportJob) {
      if (isCompleted && job.hasSnapshot) {
        actions.push({
          key: 'downloadExport',
          label: t('downloadExport'),
          icon: <Download className="mr-2 h-4 w-4" />,
          onClick: () => {
            void downloadExport();
          },
        });
      }
    } else {
      actions.push({
        key: 'download',
        label: t('downloadPayload'),
        icon: <Download className="mr-2 h-4 w-4" />,
        onClick: () => {
          void downloadPayload();
        },
      });
    }
  }

  if (canCancel) {
    actions.push({
      key: 'cancel',
      label: t('cancel'),
      icon: <Ban className="mr-2 h-4 w-4" />,
      onClick: () => setJobToCancel(job),
      variant: 'destructive',
    });
  }

  const isLoading =
    (hasBeenOpened && (isQueryLoading || isUpdateLoading)) ||
    downloadingPayload ||
    downloadingExport;

  return (
    <Actions entity={job} actions={actions} onOpenChange={handleOpenChange} isLoading={isLoading} />
  );
}
