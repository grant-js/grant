'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectSyncJobStatus } from '@grantjs/schema';
import { Ban } from 'lucide-react';

import { Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRouter } from '@/i18n/navigation';
import { getProjectImportExportListUrl } from '@/lib/entity-detail-url';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

const ACTIVE_STATUSES: ReadonlyArray<ProjectSyncJobStatus> = [
  ProjectSyncJobStatus.Pending,
  ProjectSyncJobStatus.Running,
];

export function ProjectSyncJobDetailToolbar() {
  const t = useTranslations('projectSyncJobs.actions');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const currentSyncJob = useProjectSyncJobsStore((state) => state.currentSyncJob);
  const setJobToCancel = useProjectSyncJobsStore((state) => state.setJobToCancel);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const projectGrantContext = currentSyncJob
    ? {
        resource: {
          id: currentSyncJob.projectId,
          scope: { projects: [currentSyncJob.projectId] },
        },
      }
    : undefined;

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.ProjectSyncJob,
    ResourceAction.Update,
    {
      scope: scope!,
      context: projectGrantContext,
      enabled: Boolean(currentSyncJob && scope),
      returnLoading: true,
    }
  ) as UseGrantResult;

  if (!scope) {
    return null;
  }

  const handleBack = () => {
    router.push(
      getProjectImportExportListUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string,
      })
    );
  };

  const isActive = currentSyncJob ? ACTIVE_STATUSES.includes(currentSyncJob.status) : false;
  const canCancel = Boolean(currentSyncJob && isActive && canUpdate && !requiresEmailVerification);

  const items = [
    <Button
      key="back"
      type="button"
      variant="outline"
      onClick={handleBack}
      className="w-full sm:w-auto"
    >
      {tCommon('actions.cancel')}
    </Button>,
  ];

  if (canCancel && currentSyncJob) {
    items.push(
      <Button
        key="cancel-job"
        type="button"
        variant="destructive"
        disabled={isUpdateLoading}
        onClick={() => setJobToCancel(currentSyncJob)}
        className="w-full sm:w-auto"
      >
        <Ban className="size-4 shrink-0" />
        {t('cancel')}
      </Button>
    );
  }

  return <Toolbar alwaysRow items={items} />;
}
