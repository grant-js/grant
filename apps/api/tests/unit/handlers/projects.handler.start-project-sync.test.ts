/**
 * Unit tests for ProjectHandler.startProjectSync. Focused on the
 * orchestration concerns the handler owns: input validation, idempotency on
 * `input.id`, and dispatching the worker. The actual import work belongs to
 * `ProjectImportService` and is exercised separately.
 */
import {
  CdmFindBy,
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectHandler } from '@/handlers/projects.handler';

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';

function buildJob(jobName: string | null) {
  return {
    id: '40000000-0000-4000-8000-000000000077',
    projectId,
    status: ProjectSyncJobStatus.Pending,
    cdmVersion: 1,
    jobName,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [],
    errorMessage: null,
    enqueuedAt: new Date(),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hasSnapshot: false,
    snapshotTakenAt: null,
    snapshotSizeBytes: null,
  };
}

function buildInput() {
  return {
    version: 1,
    id: null,
    mode: {
      strategy: CdmModeStrategy.Merge,
      onConflict: null,
      confirmDestructive: false,
    },
    roles: [
      {
        key: 'viewer',
        name: 'Viewer',
        permissions: [],
        groups: [],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    users: [
      {
        key: { value: userId, findBy: CdmFindBy.Id },
        name: 'User',
        roles: ['viewer'],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
    resources: [],
    permissions: [],
    groups: [],
    tags: [],
  };
}

function createHandler(opts: {
  jobsAdapter?: { enqueue: ReturnType<typeof vi.fn> } | null;
  syncJobs: {
    create: ReturnType<typeof vi.fn>;
    findActiveByJobKey: ReturnType<typeof vi.fn>;
    getById?: ReturnType<typeof vi.fn>;
    cancel?: ReturnType<typeof vi.fn>;
  };
  scheduleAfterCommit?: (fn: () => void | Promise<void>) => void;
}) {
  return new ProjectHandler(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    opts.syncJobs as never,
    opts.jobsAdapter as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    opts.scheduleAfterCommit
  );
}

describe('ProjectHandler.startProjectSync', () => {
  let create: ReturnType<typeof vi.fn>;
  let findActiveByJobKey: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    create = vi.fn();
    findActiveByJobKey = vi.fn();
    enqueue = vi.fn().mockResolvedValue(undefined);
  });

  it('does not call enqueue until scheduleAfterCommit runs (matches post-commit BullMQ dispatch)', async () => {
    const job = buildJob(null);
    create.mockResolvedValue(job);

    const deferred: Array<() => void | Promise<void>> = [];
    const scheduleAfterCommit = (fn: () => void | Promise<void>) => {
      deferred.push(fn);
    };

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      scheduleAfterCommit,
    });

    await handler.startProjectSync({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: buildInput(),
      enqueuedById: userId,
    });

    expect(enqueue).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);
    await Promise.resolve(deferred[0]?.());
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith('project-sync', {
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      payload: { jobRecordId: job.id },
    });
  });

  it('creates a job record and enqueues exactly once when no idempotency id is supplied', async () => {
    const job = buildJob(null);
    create.mockResolvedValue(job);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
    });

    const result = await handler.startProjectSync({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: buildInput(),
      enqueuedById: userId,
    });

    expect(result).toBe(job);
    expect(findActiveByJobKey).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith('project-sync', {
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      payload: { jobRecordId: job.id },
    });
  });

  it('returns the existing in-flight job and does not re-enqueue when id is already pending', async () => {
    const jobName = 'import-123';
    const inflight = buildJob(jobName);
    findActiveByJobKey.mockResolvedValue(inflight);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
    });

    const result = await handler.startProjectSync({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: { ...buildInput(), id: jobName },
      enqueuedById: userId,
    });

    expect(result).toBe(inflight);
    expect(findActiveByJobKey).toHaveBeenCalledWith({
      projectId,
      operation: 'import',
      jobName,
      statuses: ['pending', 'running'],
    });
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('throws ConfigurationError when the job adapter is not configured', async () => {
    const handler = createHandler({
      jobsAdapter: null,
      syncJobs: { create, findActiveByJobKey },
    });

    await expect(
      handler.startProjectSync({
        id: projectId,
        scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
        input: buildInput(),
        enqueuedById: userId,
      })
    ).rejects.toThrow(/job adapter is not configured/);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects validation errors before persisting or enqueueing', async () => {
    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
    });

    await expect(
      handler.startProjectSync({
        id: projectId,
        scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
        input: { ...buildInput(), version: 999 },
        enqueuedById: userId,
      })
    ).rejects.toThrow(/version/);
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects replace import without confirmDestructive before persisting', async () => {
    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
    });

    await expect(
      handler.startProjectSync({
        id: projectId,
        scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
        input: {
          ...buildInput(),
          mode: {
            strategy: CdmModeStrategy.Replace,
            onConflict: null,
            confirmDestructive: false,
          },
        },
        enqueuedById: userId,
      })
    ).rejects.toThrow(/confirmDestructive/);
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects when scope id does not contain the projectId', async () => {
    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
    });

    await expect(
      handler.startProjectSync({
        id: projectId,
        scope: {
          tenant: Tenant.AccountProject,
          id: `${accountId}:00000000-0000-4000-8000-other-projectx`,
        },
        input: buildInput(),
        enqueuedById: userId,
      })
    ).rejects.toThrow(/same projectId/);
    expect(findActiveByJobKey).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
