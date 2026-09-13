/**
 * Unit tests for ProjectHandler.startProjectExport: default job name,
 * idempotency, merge strategy, and worker dispatch.
 */
import {
  CdmModeStrategy,
  CdmOnConflict,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectHandler } from '@/handlers/projects.handler';
import { ValidationError } from '@/lib/errors';

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const projectDisplayName = 'My Project';

function buildExportJob(jobName: string | null) {
  return {
    id: '40000000-0000-4000-8000-000000000088',
    projectId,
    status: ProjectSyncJobStatus.Pending,
    cdmVersion: 1,
    jobName,
    operation: ProjectSyncJobOperation.Export,
    modeStrategy: 'merge',
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

function createHandler(opts: {
  jobsAdapter?: { enqueue: ReturnType<typeof vi.fn> } | null;
  syncJobs: {
    create: ReturnType<typeof vi.fn>;
    findActiveByJobKey: ReturnType<typeof vi.fn>;
  };
  projects?: { getProjects: ReturnType<typeof vi.fn> };
  scheduleAfterCommit?: (fn: () => void | Promise<void>) => void;
}) {
  return new ProjectHandler(
    {} as never,
    {} as never,
    (opts.projects ?? { getProjects: vi.fn() }) as never,
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

describe('ProjectHandler.startProjectExport', () => {
  let create: ReturnType<typeof vi.fn>;
  let findActiveByJobKey: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;
  let getProjects: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    create = vi.fn();
    findActiveByJobKey = vi.fn();
    enqueue = vi.fn().mockResolvedValue(undefined);
    getProjects = vi.fn().mockResolvedValue({
      projects: [{ id: projectId, name: projectDisplayName }],
      totalCount: 1,
      hasNextPage: false,
    });
  });

  it('defaults jobName to project display name and stores merge strategy', async () => {
    const job = buildExportJob(projectDisplayName);
    create.mockResolvedValue(job);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      projects: { getProjects },
    });

    const result = await handler.startProjectExport({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: { version: 1 },
      enqueuedById: userId,
    });

    expect(result).toBe(job);
    expect(getProjects).toHaveBeenCalledWith({
      ids: [projectId],
      page: 1,
      limit: 1,
      requestedFields: ['name'],
    });
    expect(findActiveByJobKey).toHaveBeenCalledWith({
      projectId,
      operation: 'export',
      jobName: projectDisplayName,
      statuses: ['pending', 'running'],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: projectDisplayName,
        operation: 'export',
        modeStrategy: 'merge',
        payload: expect.objectContaining({
          mode: {
            strategy: 'merge',
            onConflict: null,
            confirmDestructive: false,
          },
        }),
      })
    );
  });

  it('persists custom mode in payload and job row modeStrategy', async () => {
    const job = buildExportJob('custom-export');
    create.mockResolvedValue(job);
    findActiveByJobKey.mockResolvedValue(null);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      projects: { getProjects },
    });

    await handler.startProjectExport({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: {
        version: 1,
        jobName: 'custom-export',
        mode: {
          strategy: CdmModeStrategy.Replace,
          onConflict: CdmOnConflict.Fail,
          confirmDestructive: true,
        },
      },
      enqueuedById: userId,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        modeStrategy: 'replace',
        payload: expect.objectContaining({
          mode: {
            strategy: 'replace',
            onConflict: CdmOnConflict.Fail,
            confirmDestructive: true,
          },
        }),
      })
    );
  });

  it('rejects replace mode without confirmDestructive', async () => {
    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      projects: { getProjects },
    });

    await expect(
      handler.startProjectExport({
        id: projectId,
        scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
        input: {
          version: 1,
          mode: { strategy: CdmModeStrategy.Replace, confirmDestructive: false },
        },
        enqueuedById: userId,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('returns in-flight export when a pending or running job matches jobName', async () => {
    const inflight = buildExportJob(projectDisplayName);
    findActiveByJobKey.mockResolvedValueOnce(inflight);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      projects: { getProjects },
    });

    const result = await handler.startProjectExport({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: { version: 1, jobName: projectDisplayName },
      enqueuedById: userId,
    });

    expect(result).toBe(inflight);
    expect(findActiveByJobKey).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('creates a new export with the same jobName when a completed export already used the project name', async () => {
    const job = buildExportJob(projectDisplayName);
    create.mockResolvedValue(job);
    findActiveByJobKey.mockResolvedValueOnce(null);

    const handler = createHandler({
      jobsAdapter: { enqueue },
      syncJobs: { create, findActiveByJobKey },
      projects: { getProjects },
    });

    await handler.startProjectExport({
      id: projectId,
      scope: { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` },
      input: { version: 1 },
      enqueuedById: userId,
    });

    expect(findActiveByJobKey).toHaveBeenCalledTimes(1);
    expect(findActiveByJobKey).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: projectDisplayName,
        statuses: ['pending', 'running'],
      })
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: projectDisplayName,
        operation: 'export',
      })
    );
  });
});
