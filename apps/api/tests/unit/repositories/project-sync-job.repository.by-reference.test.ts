/**
 * The two shapes of a `project_sync_jobs` row (ADR 0009): an inline document in `payload`, or a
 * by-reference import whose `payload` is NULL and whose document is the object at `payload_path`.
 * One upload may start one job, which the unique index on the path enforces and the repository
 * reports as a conflict rather than a raw database error.
 */
import type { DbSchema } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '@/lib/errors';
import { ProjectSyncJobRepository } from '@/repositories/project-sync-job.repository';

const jobId = '40000000-0000-4000-8000-000000000077';
const projectId = '00000000-0000-4000-8000-000000000011';
const userId = '30000000-0000-4000-8000-000000000099';
const path = `imports/projects/${projectId}/123e4567-e89b-42d3-a456-426614174077.json`;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: jobId,
    projectId,
    scopeTenant: 'accountProject',
    scopeId: `acct:${projectId}`,
    cdmVersion: 1,
    jobName: null,
    operation: 'import',
    modeStrategy: 'merge',
    status: 'pending',
    payload: null,
    payloadPath: path,
    payloadSizeBytes: 6_291_456,
    entityCountHint: 4000,
    result: null,
    warnings: [],
    errorMessage: null,
    errorDetails: null,
    cancelRequested: null,
    enqueuedById: userId,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    snapshot: null,
    snapshotTakenAt: null,
    snapshotSizeBytes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

/** A drizzle-ish chain that resolves, or rejects, at the end. */
function chain<T>(outcome: { resolves: T } | { rejects: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const proxy: unknown = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then') {
          return (resolve: (value: T) => unknown, reject: (reason: unknown) => unknown) =>
            ('rejects' in outcome
              ? Promise.reject(outcome.rejects)
              : Promise.resolve(outcome.resolves)
            ).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    }
  );
  return { proxy, calls };
}

const insertParams = {
  projectId,
  scopeTenant: 'accountProject',
  scopeId: `acct:${projectId}`,
  cdmVersion: 1,
  jobName: null,
  operation: 'import' as const,
  modeStrategy: 'merge' as const,
  enqueuedById: userId,
};

function repoFor(method: 'insert' | 'select', outcome: Parameters<typeof chain>[0]) {
  const built = chain(outcome);
  const db = { [method]: vi.fn(() => built.proxy) } as unknown as DbSchema;
  return { repo: new ProjectSyncJobRepository(db), calls: built.calls };
}

describe('ProjectSyncJobRepository.insert', () => {
  it('stores the reference and a NULL payload for a by-reference import', async () => {
    const { repo, calls } = repoFor('insert', { resolves: [row()] });

    await repo.insert({
      ...insertParams,
      payload: null,
      payloadRef: { path, sizeBytes: 6_291_456, entityCountHint: 4000 },
    });

    const values = calls.find((call) => call.method === 'values')?.args[0] as Record<
      string,
      unknown
    >;
    expect(values).toMatchObject({
      payload: null,
      payloadPath: path,
      payloadSizeBytes: 6_291_456,
      entityCountHint: 4000,
    });
  });

  it('stores the document and no reference for an inline import', async () => {
    const document = { version: 1, roles: [], users: [] };
    const { repo, calls } = repoFor('insert', {
      resolves: [
        row({
          payload: document,
          payloadPath: null,
          payloadSizeBytes: null,
          entityCountHint: null,
        }),
      ],
    });

    await repo.insert({ ...insertParams, payload: document });

    const values = calls.find((call) => call.method === 'values')?.args[0] as Record<
      string,
      unknown
    >;
    expect(values).toMatchObject({
      payload: document,
      payloadPath: null,
      payloadSizeBytes: null,
      entityCountHint: null,
    });
  });

  it('never stores a document beside a reference', async () => {
    const { repo, calls } = repoFor('insert', { resolves: [row()] });

    await repo.insert({
      ...insertParams,
      payload: { version: 1 },
      payloadRef: { path, sizeBytes: 10, entityCountHint: null },
    });

    const values = calls.find((call) => call.method === 'values')?.args[0] as Record<
      string,
      unknown
    >;
    expect(values.payload).toBeNull();
  });

  it.each([
    ['direct', (error: object) => error],
    [
      'wrapped as a cause by Drizzle',
      (error: object) => Object.assign(new Error('Failed query'), { cause: error }),
    ],
  ])('reports a second job on the same upload as a conflict (%s)', async (_label, wrap) => {
    const unique = { code: '23505', constraint_name: 'project_sync_jobs_payload_path_unique' };
    const { repo } = repoFor('insert', { rejects: wrap(unique) });

    await expect(
      repo.insert({
        ...insertParams,
        payload: null,
        payloadRef: { path, sizeBytes: 10, entityCountHint: null },
      })
    ).rejects.toMatchObject({
      constructor: ConflictError,
      field: 'source.uploadId',
    });
  });

  it('lets any other database error through untouched', async () => {
    const other = {
      code: '23505',
      constraint_name: 'project_sync_jobs_project_operation_job_name_unique',
    };
    const { repo } = repoFor('insert', { rejects: other });

    await expect(repo.insert({ ...insertParams, payload: {} })).rejects.toBe(other);
  });
});

describe('ProjectSyncJobRepository reads', () => {
  it('getFullById returns the reference for a by-reference job', async () => {
    const { repo } = repoFor('select', { resolves: [row()] });

    const full = await repo.getFullById(jobId);

    expect(full?.payload).toBeNull();
    expect(full?.payloadRef).toEqual({ path, sizeBytes: 6_291_456, entityCountHint: 4000 });
  });

  it('getFullById returns no reference for an inline job', async () => {
    const { repo } = repoFor('select', {
      resolves: [
        row({
          payload: { version: 1 },
          payloadPath: null,
          payloadSizeBytes: null,
          entityCountHint: null,
        }),
      ],
    });

    const full = await repo.getFullById(jobId);

    expect(full?.payload).toEqual({ version: 1 });
    expect(full?.payloadRef).toBeNull();
  });

  it('getPayloadById returns the reference, not the document, for a by-reference job', async () => {
    const { repo } = repoFor('select', { resolves: [row()] });

    const result = await repo.getPayloadById(jobId);

    expect(result?.payload).toBeNull();
    expect(result?.payloadRef).toEqual({ path, sizeBytes: 6_291_456, entityCountHint: 4000 });
  });

  it('the public job entity carries neither the document nor where it is', async () => {
    const { repo } = repoFor('select', { resolves: [row()] });

    const job = await repo.getById(jobId);

    expect(JSON.stringify(job)).not.toContain('imports/');
    expect(job).not.toHaveProperty('payloadPath');
    expect(job).not.toHaveProperty('payloadRef');
  });
});
