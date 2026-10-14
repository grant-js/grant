import { useCallback, useEffect, useMemo } from 'react';
import { ApolloCache, NetworkStatus } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import type { CdmExportSection, CdmModeInput } from '@grantjs/schema';
import {
  CancelProjectSyncDocument,
  ProjectSyncJob,
  ProjectSyncJobDocument,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  RequestProjectSyncUploadUrlDocument,
  type RequestProjectSyncUploadUrlMutation,
  Scope,
  StartProjectExportDocument,
  StartProjectSyncDocument,
  SyncProjectInput,
} from '@grantjs/schema';

import { CDM_UPLOAD_CONTENT_TYPE } from '@/lib/cdm-import';
import { DirectUploadError, sendDirectUpload } from '@/lib/direct-upload';

import { evictApiKeysCache } from '../api-keys/cache';
import { evictGroupsCache } from '../groups/cache';
import { evictPermissionsCache } from '../permissions/cache';
import { evictRolesCache } from '../roles/cache';
import { evictTagsCache } from '../tags/cache';

const TERMINAL_STATUSES: ReadonlyArray<ProjectSyncJobStatus> = [
  ProjectSyncJobStatus.Completed,
  ProjectSyncJobStatus.Failed,
  ProjectSyncJobStatus.Cancelled,
];

const DEFAULT_POLL_INTERVAL_MS = 2000;

/**
 * Survives component remounts and React Strict Mode double-mount. A per-instance
 * ref would reset and allow broad field evictions + `gc()` to run again for the
 * same completed job, thrashing Apollo and downstream views.
 */
const completedSyncJobsCacheEvicted = new Set<string>();

function isTerminalStatus(status: ProjectSyncJobStatus | undefined): boolean {
  return status != null && TERMINAL_STATUSES.includes(status);
}

function evictAffectedCaches(cache: ApolloCache, jobId: string) {
  if (completedSyncJobsCacheEvicted.has(jobId)) return;
  completedSyncJobsCacheEvicted.add(jobId);
  evictPermissionsCache(cache);
  evictRolesCache(cache);
  evictGroupsCache(cache);
  evictTagsCache(cache);
  evictApiKeysCache(cache);
}

/**
 * Mutation hook to enqueue an async CDM import job.
 * Returns the persisted job row including its id and current status.
 */
function useStartProjectSync() {
  const [start, state] = useMutation<{ startProjectSync: ProjectSyncJob }>(
    StartProjectSyncDocument
  );

  const startSync = useCallback(
    async (params: { id: string; scope: Scope; input: SyncProjectInput }) => {
      const { id, scope, input } = params;
      const result = await start({ variables: { id, scope, input } });
      return result.data?.startProjectSync;
    },
    [start]
  );

  return {
    startSync,
    loading: state.loading,
    error: state.error,
    job: state.data?.startProjectSync,
    reset: state.reset,
  };
}

export interface ImportProjectSyncByReferenceParams {
  id: string;
  scope: Scope;
  /** The CDM file, sent as it is: its bytes never pass through a FileReader or JSON.parse. */
  file: File;
  /** Idempotency key for the job (`SyncProjectInput.id`). */
  jobName: string;
  /** How to apply the document. Must agree with the document's own `mode.strategy`. */
  mode: CdmModeInput;
  /** Only when the client parsed the document; the server checks it against the file. */
  version?: number;
  /** A hint for the job list; the worker counts the document itself. */
  entityCount?: number;
  signal?: AbortSignal;
}

/**
 * Start a CDM import by reference (ADR 0009): ask the API for an upload URL, PUT the file
 * straight to storage with exactly the headers it named, then start the job from the
 * returned `uploadId`.
 *
 * The three steps fail in different ways and the caller needs to tell them apart, so each
 * error is left as it came: a refused mint is an Apollo error (a size refusal carries the
 * domain code `PAYLOAD_TOO_LARGE`), a failed transfer is a `DirectUploadError`, and a
 * refused start is an Apollo error again. After a failed start the object is still in
 * storage; it is expired by the `imports/` lifecycle rule, and a retry mints a new upload.
 */
export function useImportProjectSyncByReference() {
  const [requestUploadUrl] = useMutation<RequestProjectSyncUploadUrlMutation>(
    RequestProjectSyncUploadUrlDocument
  );
  const { startSync } = useStartProjectSync();

  const importByReference = useCallback(
    async (params: ImportProjectSyncByReferenceParams) => {
      const { id, scope, file, jobName, mode, version, entityCount, signal } = params;

      const minted = await requestUploadUrl({
        variables: {
          id,
          scope,
          input: { contentLength: file.size, contentType: CDM_UPLOAD_CONTENT_TYPE },
        },
      });
      const ticket = minted.data?.requestProjectSyncUploadUrl;
      if (!ticket) {
        throw new DirectUploadError('rejected', 'The API did not issue an upload URL');
      }

      await sendDirectUpload({ ticket, body: file, signal });

      return startSync({
        id,
        scope,
        input: {
          id: jobName,
          mode,
          ...(version !== undefined ? { version } : {}),
          source: {
            uploadId: ticket.uploadId,
            ...(entityCount !== undefined ? { entityCount } : {}),
          },
        },
      });
    },
    [requestUploadUrl, startSync]
  );

  return { importByReference };
}

/** Enqueue an async CDM export job (same pipeline as import; artifact in job snapshot). */
export function useStartProjectExport() {
  const [start, state] = useMutation<{ startProjectExport: ProjectSyncJob }>(
    StartProjectExportDocument
  );

  const startExport = useCallback(
    async (params: {
      id: string;
      scope: Scope;
      input: {
        version: number;
        jobName?: string | null;
        sections?: readonly CdmExportSection[];
        includeUserApiKeys?: boolean | null;
        mode?: CdmModeInput | null;
      };
    }) => {
      const { id, scope, input } = params;
      const result = await start({ variables: { id, scope, input } });
      return result.data?.startProjectExport;
    },
    [start]
  );

  return {
    startExport,
    loading: state.loading,
    error: state.error,
    job: state.data?.startProjectExport,
    reset: state.reset,
  };
}

export interface UseProjectSyncJobParams {
  id: string;
  scope: Scope | undefined;
  jobId: string | undefined;
  /**
   * How often to refetch while the job is in PENDING/RUNNING. Defaults to 2s.
   * Set to 0 to disable polling.
   */
  pollIntervalMs?: number;
  /** Set true to skip the query (e.g. before the job is started). */
  skip?: boolean;
}

/**
 * Query hook that polls the status of an async sync job. Polling stops
 * automatically once the job reaches a terminal status (completed, failed,
 * or cancelled). On completion, scope-related Apollo caches are evicted so
 * downstream queries refetch fresh data (including tags and API keys).
 */
export function useProjectSyncJob(params: UseProjectSyncJobParams) {
  const { id, scope, jobId, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, skip: skipParam } = params;

  const skip = useMemo(
    () => skipParam === true || !id || !jobId || !scope || !scope.id || !scope.tenant,
    [skipParam, id, jobId, scope]
  );

  const { data, loading, error, networkStatus, refetch, startPolling, stopPolling, client } =
    useQuery(ProjectSyncJobDocument, {
      variables: { id, scope: scope ?? ({} as Scope), jobId: jobId ?? '' },
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      pollInterval: pollIntervalMs > 0 ? pollIntervalMs : 0,
    });

  const job = data?.projectSyncJob as ProjectSyncJob | undefined;
  const status = job?.status;
  const isTerminal = isTerminalStatus(status);
  const isActive =
    status === ProjectSyncJobStatus.Pending || status === ProjectSyncJobStatus.Running;

  useEffect(() => {
    if (!job) return;
    if (
      status === ProjectSyncJobStatus.Completed &&
      job.operation === ProjectSyncJobOperation.Import
    ) {
      // Defer past the current commit; eviction + gc touches all watchers.
      queueMicrotask(() => {
        evictAffectedCaches(client.cache, job.id);
      });
    }
    if (isTerminal) {
      stopPolling();
    }
  }, [job, status, isTerminal, client, stopPolling]);

  return {
    job,
    loading: loading && networkStatus !== NetworkStatus.poll,
    polling: networkStatus === NetworkStatus.poll,
    error,
    isTerminal,
    isActive,
    refetch,
    startPolling,
    stopPolling,
  };
}

/** Mutation hook to cancel an in-flight sync job (best-effort once RUNNING). */
export function useCancelProjectSync() {
  const [cancel, state] = useMutation<{ cancelProjectSync: ProjectSyncJob }>(
    CancelProjectSyncDocument
  );

  const cancelSync = useCallback(
    async (params: { id: string; scope: Scope; jobId: string }) => {
      const result = await cancel({ variables: params });
      return result.data?.cancelProjectSync;
    },
    [cancel]
  );

  return {
    cancelSync,
    loading: state.loading,
    error: state.error,
    reset: state.reset,
  };
}
