'use client';

import { useTranslations } from 'next-intl';
import { CdmOnConflict } from '@grantjs/schema';
import { AlertCircle, Loader2 } from 'lucide-react';

import { FeatureModuleCard, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';

import { PROJECT_SYNC_JOB_CDM_EDITOR_HEIGHT } from './project-sync-job-display';
import { ProjectSyncJobOnConflictBadge } from './project-sync-job-on-conflict-badge';

interface ProjectSyncJobPayloadCardProps {
  payload: Record<string, unknown> | null;
  loading: boolean;
  error: Error | null;
  onConflict?: CdmOnConflict | null;
  onReload: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
}

export function ProjectSyncJobPayloadCard({
  payload,
  loading,
  error,
  onConflict,
  onReload,
  onDownload,
}: ProjectSyncJobPayloadCardProps) {
  const t = useTranslations('projectSyncJobs.detail');
  const tPayload = useTranslations('projectSyncJobs.viewDialog.payload');
  const tFields = useTranslations('projectSyncJobs.viewDialog.fields');

  return (
    <FeatureModuleCard
      title={t('payload.title')}
      description={t('payload.description')}
      collapsible
      footer={
        <div className="flex w-full justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void onReload()}
            disabled={loading}
          >
            {tPayload('reload')}
          </Button>
          <Button type="button" onClick={() => void onDownload()} disabled={loading || !payload}>
            {tPayload('download')}
          </Button>
        </div>
      }
    >
      {onConflict != null && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
          <span className="text-muted-foreground">{tFields('onConflict')}</span>
          <ProjectSyncJobOnConflictBadge onConflict={onConflict} />
        </div>
      )}

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words">{error.message}</p>
        </div>
      ) : loading && !payload ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tPayload('loading')}
        </div>
      ) : payload ? (
        <JsonEditor
          value={payload as object}
          disabled
          height={PROJECT_SYNC_JOB_CDM_EDITOR_HEIGHT}
        />
      ) : (
        <p className="py-4 text-sm text-muted-foreground">{tPayload('notAvailable')}</p>
      )}
    </FeatureModuleCard>
  );
}
