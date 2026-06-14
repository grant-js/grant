import {
  CdmModeStrategy,
  CdmOnConflict,
  ProjectSyncJob,
  ProjectSyncJobOperation,
} from '@grantjs/schema';

import { getInitials } from '@/lib/utils';

export type ProjectSyncJobOperationLabelKey = 'operation.import' | 'operation.export';

export function getJobAvatarInitial(job: Pick<ProjectSyncJob, 'jobName'>): string {
  return getInitials(job.jobName, 2, '?');
}

export function getOperationLabelKey(
  operation: ProjectSyncJobOperation
): ProjectSyncJobOperationLabelKey {
  if (operation === ProjectSyncJobOperation.Import) {
    return 'operation.import';
  }
  return 'operation.export';
}

export function formatModeStrategy(
  job: Pick<ProjectSyncJob, 'modeStrategy'>,
  tStart: (key: string) => string
): string {
  if (!job.modeStrategy) {
    return '—';
  }
  return job.modeStrategy === CdmModeStrategy.Merge
    ? tStart('summary.strategy.merge')
    : tStart('summary.strategy.replace');
}

export type ProjectSyncJobOnConflictLabelKey =
  | 'summary.onConflict.fail'
  | 'summary.onConflict.skip'
  | 'summary.onConflict.update';

export function getOnConflictLabelKey(onConflict: CdmOnConflict): ProjectSyncJobOnConflictLabelKey {
  switch (onConflict) {
    case CdmOnConflict.Fail:
      return 'summary.onConflict.fail';
    case CdmOnConflict.Skip:
      return 'summary.onConflict.skip';
    case CdmOnConflict.Update:
      return 'summary.onConflict.update';
    default:
      return 'summary.onConflict.fail';
  }
}

export interface ProjectSyncJobPayloadModeDetails {
  onConflict?: CdmOnConflict | null;
  confirmDestructive?: boolean | null;
}

/** Reads CDM `mode` fields from a job payload (import CDM or export options). */
export function getPayloadModeDetails(
  payload: Record<string, unknown> | null | undefined
): ProjectSyncJobPayloadModeDetails | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const mode = payload.mode;
  if (!mode || typeof mode !== 'object') {
    return null;
  }
  const record = mode as Record<string, unknown>;
  const details: ProjectSyncJobPayloadModeDetails = {};
  if (record.onConflict != null && typeof record.onConflict === 'string') {
    details.onConflict = record.onConflict as CdmOnConflict;
  }
  if (typeof record.confirmDestructive === 'boolean') {
    details.confirmDestructive = record.confirmDestructive;
  }
  if (details.onConflict === undefined && details.confirmDestructive === undefined) {
    return null;
  }
  return details;
}

/** Fixed height for CDM JSON editors — CodeMirror scrolls inside the editor viewport. */
export const PROJECT_SYNC_JOB_CDM_EDITOR_HEIGHT = 'min(32rem, 70vh)';

/** Scrollable cap for non-editor card bodies (e.g. warning lists). */
export const PROJECT_SYNC_JOB_SCROLLABLE_CARD_BODY_CLASS =
  'max-h-[min(32rem,70vh)] min-h-0 overflow-y-auto';
