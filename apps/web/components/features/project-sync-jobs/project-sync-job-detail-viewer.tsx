'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ProjectSyncJobOperation } from '@grantjs/schema';

import { FeatureDetailLayout } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectSyncJob, useProjectSyncJobPayload } from '@/hooks/projects';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

import { getPayloadModeDetails } from './project-sync-job-display';
import { ProjectSyncJobGeneralCard } from './project-sync-job-general-card';
import { ProjectSyncJobPayloadCard } from './project-sync-job-payload-card';
import { ProjectSyncJobResultCard } from './project-sync-job-result-card';
import { ProjectSyncJobSnapshotCard } from './project-sync-job-snapshot-card';
import { ProjectSyncJobWarningsCard } from './project-sync-job-warnings-card';

export function ProjectSyncJobDetailViewer() {
  const t = useTranslations('projectSyncJobs.detail');
  const params = useParams();
  const projectId = params.projectId as string;
  const jobId = params.jobId as string;
  const scope = useScopeFromParams();
  const setCurrentSyncJob = useProjectSyncJobsStore((state) => state.setCurrentSyncJob);

  const { job, loading, error, polling } = useProjectSyncJob({
    id: projectId,
    scope: scope ?? undefined,
    jobId,
  });

  const isImportJob = job?.operation === ProjectSyncJobOperation.Import;
  const {
    payload,
    loading: payloadLoading,
    error: payloadError,
    download,
    reload,
  } = useProjectSyncJobPayload({
    id: projectId,
    scope: scope ?? null,
    jobId: isImportJob ? jobId : null,
  });

  const payloadMode = useMemo(() => getPayloadModeDetails(payload), [payload]);

  useEffect(() => {
    setCurrentSyncJob(job ?? null);
    return () => setCurrentSyncJob(null);
  }, [job, setCurrentSyncJob]);

  if (loading && !job) {
    return <div>{t('loading')}</div>;
  }

  if (error || !job) {
    return <div>{t('error')}</div>;
  }

  const isExportJob = job.operation === ProjectSyncJobOperation.Export;

  return (
    <FeatureDetailLayout className="max-w-4xl">
      <ProjectSyncJobGeneralCard
        job={job}
        polling={polling}
        confirmDestructive={payloadMode?.confirmDestructive}
      />
      <ProjectSyncJobWarningsCard job={job} />
      {!isExportJob && <ProjectSyncJobResultCard job={job} />}
      {!isExportJob && (
        <ProjectSyncJobPayloadCard
          payload={payload}
          loading={payloadLoading}
          error={payloadError}
          onConflict={payloadMode?.onConflict}
          onReload={reload}
          onDownload={download}
        />
      )}
      <ProjectSyncJobSnapshotCard job={job} />
    </FeatureDetailLayout>
  );
}
