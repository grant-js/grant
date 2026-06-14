'use client';

import { useTranslations } from 'next-intl';
import { ProjectSyncJob, ProjectSyncJobOperation } from '@grantjs/schema';
import { AlertCircle, Loader2 } from 'lucide-react';

import { FeatureModuleCard, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectSyncJobSnapshot } from '@/hooks/projects';

import { PROJECT_SYNC_JOB_CDM_EDITOR_HEIGHT } from './project-sync-job-display';

interface ProjectSyncJobSnapshotCardProps {
  job: ProjectSyncJob;
}

export function ProjectSyncJobSnapshotCard({ job }: ProjectSyncJobSnapshotCardProps) {
  const t = useTranslations('projectSyncJobs.detail');
  const tSnapshot = useTranslations('projectSyncJobs.viewDialog.snapshot');
  const scope = useScopeFromParams();
  const isExportJob = job.operation === ProjectSyncJobOperation.Export;

  const { snapshot, loading, error, download, reload } = useProjectSyncJobSnapshot({
    id: job.projectId,
    scope: scope ?? null,
    jobId: job.hasSnapshot ? job.id : null,
    skip: !job.hasSnapshot,
  });

  return (
    <FeatureModuleCard
      title={isExportJob ? t('exportArtifact.title') : t('snapshot.title')}
      description={isExportJob ? t('exportArtifact.description') : t('snapshot.description')}
      collapsible
      footer={
        job.hasSnapshot ? (
          <div className="flex w-full justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void reload()}
              disabled={loading}
            >
              {tSnapshot('reload')}
            </Button>
            <Button type="button" onClick={() => void download()} disabled={loading || !snapshot}>
              {tSnapshot('download')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!job.hasSnapshot ? (
        <p className="py-4 text-sm text-muted-foreground">{tSnapshot('notAvailable')}</p>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error.message}</p>
        </div>
      ) : loading && !snapshot ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tSnapshot('loading')}
        </div>
      ) : snapshot ? (
        <JsonEditor
          value={snapshot as object}
          disabled
          height={PROJECT_SYNC_JOB_CDM_EDITOR_HEIGHT}
        />
      ) : (
        <p className="py-4 text-sm text-muted-foreground">{tSnapshot('notAvailable')}</p>
      )}
    </FeatureModuleCard>
  );
}
