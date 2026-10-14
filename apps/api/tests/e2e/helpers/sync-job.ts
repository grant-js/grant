/**
 * E2E helpers for project CDM sync job REST endpoints.
 */
import type { ProjectSyncJob, SyncProjectInput } from '@grantjs/schema';
import { ProjectSyncJobStatus, Tenant } from '@grantjs/schema';
import type supertest from 'supertest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmRestPayload } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from './api-client';

export interface SyncScope {
  tenant: typeof Tenant.AccountProject | typeof Tenant.OrganizationProject;
  id: string;
}

export interface SyncJobResponseBody {
  success?: boolean;
  data?: ProjectSyncJob;
  error?: string;
  code?: string;
}

export function scopeForAccountProject(accountId: string, projectId: string): SyncScope {
  return { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
}

export function scopeForOrganizationProject(organizationId: string, projectId: string): SyncScope {
  return { tenant: Tenant.OrganizationProject, id: `${organizationId}:${projectId}` };
}

function scopeQuery(scope: SyncScope) {
  return { scopeId: scope.id, tenant: scope.tenant };
}

export async function postImport(
  authHeader: string,
  projectId: string,
  scope: SyncScope,
  cdm: CdmDocumentInput
): Promise<{ status: number; body: SyncJobResponseBody; job?: ProjectSyncJob }> {
  const res = await apiClient()
    .post(`/api/projects/${projectId}/sync/jobs`)
    .set('Authorization', authHeader)
    .send({ scope, ...cdmRestPayload(cdm) });

  return {
    status: res.status,
    body: res.body as SyncJobResponseBody,
    job: (res.body as SyncJobResponseBody).data,
  };
}

export async function postExport(
  authHeader: string,
  projectId: string,
  scope: SyncScope,
  input: {
    version: number;
    jobName?: string;
    sections?: string[];
    includeUserApiKeys?: boolean;
    mode?: SyncProjectInput['mode'];
  }
): Promise<{ status: number; body: SyncJobResponseBody; job?: ProjectSyncJob }> {
  const res = await apiClient()
    .post(`/api/projects/${projectId}/sync/jobs/export`)
    .set('Authorization', authHeader)
    .send({ scope, ...input });

  return {
    status: res.status,
    body: res.body as SyncJobResponseBody,
    job: (res.body as SyncJobResponseBody).data,
  };
}

export async function getJob(
  authHeader: string,
  projectId: string,
  jobId: string,
  scope: SyncScope
): Promise<{ status: number; body: SyncJobResponseBody; job?: ProjectSyncJob }> {
  const res = await apiClient()
    .get(`/api/projects/${projectId}/sync/jobs/${jobId}`)
    .query(scopeQuery(scope))
    .set('Authorization', authHeader);

  return {
    status: res.status,
    body: res.body as SyncJobResponseBody,
    job: (res.body as SyncJobResponseBody).data,
  };
}

export async function listJobs(
  authHeader: string,
  projectId: string,
  scope: SyncScope,
  query: Record<string, string | number> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await apiClient()
    .get(`/api/projects/${projectId}/sync/jobs`)
    .query({ ...scopeQuery(scope), page: 1, limit: 20, ...query })
    .set('Authorization', authHeader);

  return { status: res.status, body: res.body as Record<string, unknown> };
}

export async function cancelJob(
  authHeader: string,
  projectId: string,
  jobId: string,
  scope: SyncScope
): Promise<{ status: number; body: SyncJobResponseBody }> {
  const res = await apiClient()
    .delete(`/api/projects/${projectId}/sync/jobs/${jobId}`)
    .query(scopeQuery(scope))
    .set('Authorization', authHeader);

  return { status: res.status, body: res.body as SyncJobResponseBody };
}

export async function downloadPayload(
  authHeader: string,
  projectId: string,
  jobId: string,
  scope: SyncScope
): Promise<{ status: number; headers: Record<string, string>; payload: SyncProjectInput }> {
  const res = await apiClient()
    .get(`/api/projects/${projectId}/sync/jobs/${jobId}/payload`)
    .query(scopeQuery(scope))
    .set('Authorization', authHeader);

  return {
    status: res.status,
    headers: res.headers as Record<string, string>,
    payload: res.body as SyncProjectInput,
  };
}

export async function downloadSnapshot(
  authHeader: string,
  projectId: string,
  jobId: string,
  scope: SyncScope
): Promise<{ status: number; headers: Record<string, string>; snapshot: SyncProjectInput }> {
  const res = await apiClient()
    .get(`/api/projects/${projectId}/sync/jobs/${jobId}/snapshot`)
    .query(scopeQuery(scope))
    .set('Authorization', authHeader);

  return {
    status: res.status,
    headers: res.headers as Record<string, string>,
    snapshot: res.body as SyncProjectInput,
  };
}

const TERMINAL: ReadonlySet<ProjectSyncJobStatus> = new Set([
  ProjectSyncJobStatus.Completed,
  ProjectSyncJobStatus.Failed,
  ProjectSyncJobStatus.Cancelled,
]);

export type JobStatusRef = { id: string; status: ProjectSyncJobStatus };

export function expectJobTerminal(
  job: JobStatusRef | undefined,
  expected: ProjectSyncJobStatus
): void {
  if (!job) {
    throw new Error('Expected job to be defined');
  }
  if (!TERMINAL.has(job.status)) {
    throw new Error(`Expected terminal status ${expected}, got in-flight ${job.status}`);
  }
  if (job.status !== expected) {
    throw new Error(`Expected job status ${expected}, got ${job.status}`);
  }
}

/**
 * Jobs enqueue after the HTTP response (deferred worker). Poll until terminal when needed.
 */
export async function resolveJob(
  authHeader: string,
  projectId: string,
  scope: SyncScope,
  job: JobStatusRef | undefined,
  expected: ProjectSyncJobStatus = ProjectSyncJobStatus.Completed
): Promise<ProjectSyncJob> {
  if (!job?.id) {
    throw new Error('Expected job id from enqueue response');
  }
  if (TERMINAL.has(job.status)) {
    expectJobTerminal(job, expected);
    const { job: full } = await getJob(authHeader, projectId, job.id, scope);
    if (!full) {
      throw new Error(`Expected job ${job.id} after terminal enqueue response`);
    }
    expectJobTerminal(full, expected);
    return full;
  }
  return pollJob(authHeader, projectId, job.id, scope, expected);
}

export async function pollJob(
  authHeader: string,
  projectId: string,
  jobId: string,
  scope: SyncScope,
  expected: ProjectSyncJobStatus,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<ProjectSyncJob> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const intervalMs = opts.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  let last: ProjectSyncJob | undefined;

  while (Date.now() < deadline) {
    const { status, job } = await getJob(authHeader, projectId, jobId, scope);
    if (status === 200 && job) {
      last = job;
      if (TERMINAL.has(job.status)) {
        if (job.status !== expected) {
          const detail =
            job.status === ProjectSyncJobStatus.Failed && job.errorMessage
              ? ` — ${job.errorMessage}`
              : '';
          throw new Error(`Poll expected ${expected}, got ${job.status}${detail}`);
        }
        return job;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out polling job ${jobId}; last status=${last?.status ?? 'unknown'}`);
}

export type { supertest };
