/**
 * Unit tests for the async ProjectSyncJob worker. The worker is
 * responsible for state-machine transitions, executing the sync inside a
 * transaction, and post-commit cache invalidation. We mock the transactional
 * connection so tests are independent of Postgres.
 */
import { ConflictError } from '@grantjs/core';
import {
  CdmFindBy,
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  type Scope,
  type SyncProjectInput,
  type SyncProjectResult,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectSyncJob from '@/jobs/project-sync.job';
import type { AppContext } from '@/types';

vi.mock('@/lib/jobs/tenant-job.validation', () => ({
  assertTenantActive: vi.fn().mockResolvedValue(undefined),
}));

/** Worker wraps DB calls with `setRlsContext`; real impl executes SQL on mocked txs — noop for tests. */
vi.mock('@/lib/rls', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/rls')>();
  return {
    ...mod,
    setRlsContext: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/lib/transaction-manager.lib', () => {
  return {
    DrizzleTransactionalConnection: class {
      async withTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
        return fn({ __mockTx: true });
      }
    },
  };
});

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const jobRecordId = '40000000-0000-4000-8000-000000000077';
const enqueueScope: Scope = {
  tenant: Tenant.AccountProject,
  id: `${accountId}:${projectId}`,
};

function emptyCanonicalPayload(overrides: Partial<SyncProjectInput> = {}): SyncProjectInput {
  return {
    version: 1,
    id: null,
    mode: {
      strategy: CdmModeStrategy.Merge,
      onConflict: null,
      confirmDestructive: false,
    },
    roles: [],
    users: [],
    resources: [],
    permissions: [],
    groups: [],
    tags: [],
    ...overrides,
  };
}

function buildJobRow(status: ProjectSyncJobStatus = ProjectSyncJobStatus.Pending) {
  return {
    id: jobRecordId,
    projectId,
    status,
    cdmVersion: 1,
    jobName: null,
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

function buildExportExecData(
  overrides: Partial<{
    status: ProjectSyncJobStatus;
    cancelRequested: boolean;
    sections?: string[];
    includeUserApiKeys?: boolean;
    mode?: {
      strategy: 'merge' | 'replace';
      onConflict?: string | null;
      confirmDestructive?: boolean;
    };
  }> = {}
) {
  const status = overrides.status ?? ProjectSyncJobStatus.Pending;
  return {
    job: {
      ...buildJobRow(status),
      operation: ProjectSyncJobOperation.Export,
      modeStrategy: null,
    },
    payload: {
      version: 1,
      ...(overrides.sections != null ? { sections: overrides.sections } : {}),
      ...(overrides.includeUserApiKeys !== undefined
        ? { includeUserApiKeys: overrides.includeUserApiKeys }
        : {}),
      ...(overrides.mode != null ? { mode: overrides.mode } : {}),
    },
    scope: enqueueScope,
    cancelRequested: overrides.cancelRequested ?? false,
  };
}

function buildExecData(
  overrides: Partial<{
    status: ProjectSyncJobStatus;
    cancelRequested: boolean;
    userIds: string[];
  }> = {}
) {
  const status = overrides.status ?? ProjectSyncJobStatus.Pending;
  return {
    job: buildJobRow(status),
    payload: emptyCanonicalPayload({
      roles: [
        {
          key: 'viewer',
          name: 'Viewer',
          description: null,
          groups: [],
          permissions: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
      users: (overrides.userIds ?? [userId]).map((uid) => ({
        key: { value: uid, findBy: CdmFindBy.Id },
        name: 'User',
        roles: ['viewer'],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      })),
    }),
    scope: enqueueScope,
    cancelRequested: overrides.cancelRequested ?? false,
  };
}

/** Passed through `db.transaction` mocks so assertions match worker RLS wrappers. */
const mockOuterTx = { __outerTx: true };

function buildSyncResult(): SyncProjectResult {
  return {
    projectId,
    importId: null,
    rolesCreated: 1,
    groupsCreated: 1,
    roleGroupsLinked: 1,
    groupPermissionsLinked: 1,
    projectRolesLinked: 1,
    projectGroupsLinked: 1,
    projectPermissionsLinked: 1,
    projectResourcesLinked: 0,
    projectUsersEnsured: 1,
    usersCreated: 0,
    userRolesAssigned: 1,
    projectUserApiKeysCreated: 0,
    tagsCreated: 0,
    projectTagsLinked: 0,
    roleTagsLinked: 0,
    groupTagsLinked: 0,
    userTagsLinked: 0,
    resourcesCreated: 0,
    permissionsCreated: 0,
    warnings: ['orphan permission ignored'],
  };
}

interface MockServices {
  loadForExecution: ReturnType<typeof vi.fn>;
  transitionToRunning: ReturnType<typeof vi.fn>;
  markCompleted: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  saveSnapshot: ReturnType<typeof vi.fn>;
  importProjectCdm: ReturnType<typeof vi.fn>;
  invalidateCachesForImportResult: ReturnType<typeof vi.fn>;
  exportProjectCdm: ReturnType<typeof vi.fn>;
}

function buildJobInstance(mocks: MockServices) {
  const appContext = {
    db: {
      transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockOuterTx)),
    },
    services: {
      projectSyncJobs: {
        loadForExecution: mocks.loadForExecution,
        transitionToRunning: mocks.transitionToRunning,
        markCompleted: mocks.markCompleted,
        markFailed: mocks.markFailed,
        saveSnapshot: mocks.saveSnapshot,
      },
      projectImport: {
        importProjectCdm: mocks.importProjectCdm,
        invalidateCachesForImportResult: mocks.invalidateCachesForImportResult,
      },
      projectExport: {
        exportProjectCdm: mocks.exportProjectCdm,
      },
    },
  } as unknown as AppContext;
  return new ProjectSyncJob(appContext);
}

describe('ProjectSyncJob worker', () => {
  let mocks: MockServices;

  beforeEach(() => {
    mocks = {
      loadForExecution: vi.fn(),
      transitionToRunning: vi.fn().mockResolvedValue(undefined),
      markCompleted: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
      saveSnapshot: vi.fn().mockResolvedValue(undefined),
      importProjectCdm: vi.fn(),
      invalidateCachesForImportResult: vi.fn().mockResolvedValue(undefined),
      exportProjectCdm: vi.fn().mockResolvedValue(emptyCanonicalPayload()),
    };
  });

  /**
   * Redelivery, which slice 13 had to establish before touching the queue's visibility
   * timeout.
   *
   * SQS delivers at least once. A visibility window shorter than the consumer's runtime
   * means a second consumer receives a message the first is still working on — and every
   * path here mutates a tenant's permission model, so applying an import twice is a
   * security outcome rather than a duplicate row.
   *
   * The guard is `transitionToRunning`, which refuses from any status but `PENDING`. These
   * assert that the refusal actually prevents the second apply, because an unasserted
   * guard is how a later refactor moves the transition after the import.
   */
  describe('a redelivered message', () => {
    it('does not apply the import a second time', async () => {
      mocks.loadForExecution.mockResolvedValue(buildExecData());
      // What the real service does when the row is already RUNNING or terminal.
      mocks.transitionToRunning.mockRejectedValue(
        new ConflictError('Cannot transition job to RUNNING from status RUNNING')
      );

      const job = buildJobInstance(mocks);
      const ctx = {
        jobId: 'queue-job-redelivered',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: { jobRecordId },
      };

      await expect(job.execute(ctx)).rejects.toThrow(ConflictError);

      expect(mocks.importProjectCdm).not.toHaveBeenCalled();
      expect(mocks.markCompleted).not.toHaveBeenCalled();
    });

    it("takes no rollback snapshot either, so the first attempt's snapshot survives", async () => {
      // The snapshot is the only way back from a bad import. A second attempt overwriting
      // it with the half-applied state of the first would destroy exactly the thing it
      // exists for.
      mocks.loadForExecution.mockResolvedValue(buildExecData());
      mocks.transitionToRunning.mockRejectedValue(
        new ConflictError('Cannot transition job to RUNNING from status COMPLETED')
      );

      const job = buildJobInstance(mocks);

      await expect(
        job.execute({
          jobId: 'queue-job-redelivered-2',
          scheduledAt: new Date(),
          startedAt: new Date(),
          scope: enqueueScope,
          payload: { jobRecordId },
        })
      ).rejects.toThrow(ConflictError);

      expect(mocks.saveSnapshot).not.toHaveBeenCalled();
      expect(mocks.exportProjectCdm).not.toHaveBeenCalled();
    });

    it('claims RUNNING before doing any work, not after', async () => {
      // The ordering *is* the guarantee. If the import ran first and the status moved
      // afterwards, two concurrent consumers would both pass the guard and both apply.
      mocks.loadForExecution.mockResolvedValue(buildExecData());
      mocks.importProjectCdm.mockResolvedValue(buildSyncResult());

      const order: string[] = [];
      mocks.transitionToRunning.mockImplementation(async () => {
        order.push('transitionToRunning');
      });
      mocks.importProjectCdm.mockImplementation(async () => {
        order.push('importProjectCdm');
        return buildSyncResult();
      });

      const job = buildJobInstance(mocks);
      await job.execute({
        jobId: 'queue-job-ordering',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: { jobRecordId },
      });

      expect(order).toEqual(['transitionToRunning', 'importProjectCdm']);
    });
  });

  it('runs the full happy path: pending → running → completed and invalidates caches', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData());
    const result = buildSyncResult();
    mocks.importProjectCdm.mockResolvedValue(result);

    const job = buildJobInstance(mocks);
    const ctx = {
      jobId: 'queue-job-1',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    };

    const outcome = await job.execute(ctx);

    expect(outcome.success).toBe(true);
    expect(mocks.loadForExecution).toHaveBeenCalledWith({ jobId: jobRecordId }, mockOuterTx);
    expect(mocks.transitionToRunning).toHaveBeenCalledWith({ jobId: jobRecordId }, mockOuterTx);
    expect(mocks.importProjectCdm).toHaveBeenCalledTimes(1);
    expect(mocks.markCompleted).toHaveBeenCalledWith(
      {
        jobId: jobRecordId,
        result,
        warnings: ['orphan permission ignored'],
      },
      mockOuterTx
    );
    expect(mocks.invalidateCachesForImportResult).toHaveBeenCalledWith({
      scope: enqueueScope,
      userIds: [userId],
    });
    expect(mocks.markFailed).not.toHaveBeenCalled();
  });

  it('export job: materialises CDM, saves snapshot, marks completed with null result', async () => {
    mocks.loadForExecution.mockResolvedValue(
      buildExportExecData({ sections: ['roles'], includeUserApiKeys: false })
    );
    const exported = emptyCanonicalPayload({ id: 'my-project' });
    mocks.exportProjectCdm.mockResolvedValue(exported);

    const job = buildJobInstance(mocks);
    const outcome = await job.execute({
      jobId: 'queue-export-1',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    });

    expect(outcome.success).toBe(true);
    expect(mocks.importProjectCdm).not.toHaveBeenCalled();
    expect(mocks.exportProjectCdm).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        scope: enqueueScope,
        version: 1,
        sections: ['roles'],
        includeUserApiKeys: false,
        mode: undefined,
      }),
      expect.objectContaining({ __mockTx: true })
    );
    expect(mocks.saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: jobRecordId,
        snapshot: exported,
      }),
      expect.objectContaining({ __mockTx: true })
    );
    expect(mocks.markCompleted).toHaveBeenCalledWith(
      {
        jobId: jobRecordId,
        result: null,
        warnings: [],
      },
      expect.objectContaining({ __mockTx: true })
    );
    expect(mocks.invalidateCachesForImportResult).not.toHaveBeenCalled();
  });

  it('import with replace mode forwards mode to syncProject', async () => {
    const replaceMode = {
      strategy: CdmModeStrategy.Replace,
      onConflict: null,
      confirmDestructive: true,
    };
    mocks.loadForExecution.mockResolvedValue({
      ...buildExecData(),
      payload: emptyCanonicalPayload({ mode: replaceMode }),
    });
    mocks.importProjectCdm.mockResolvedValue(buildSyncResult());

    const job = buildJobInstance(mocks);
    await job.execute({
      jobId: 'queue-replace',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    });

    expect(mocks.importProjectCdm).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ mode: replaceMode }),
      }),
      expect.anything()
    );
  });

  it('export job forwards mode from payload to export service', async () => {
    const exportMode = {
      strategy: 'replace' as const,
      onConflict: 'fail' as const,
      confirmDestructive: true,
    };
    mocks.loadForExecution.mockResolvedValue(buildExportExecData({ mode: exportMode }));
    mocks.exportProjectCdm.mockResolvedValue(emptyCanonicalPayload());

    const job = buildJobInstance(mocks);
    await job.execute({
      jobId: 'queue-export-mode',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    });

    expect(mocks.exportProjectCdm).toHaveBeenCalledWith(
      expect.objectContaining({ mode: exportMode }),
      expect.objectContaining({ __mockTx: true })
    );
  });

  it('captures a pre-sync snapshot inside the same transaction, before syncProject runs', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData());
    mocks.importProjectCdm.mockResolvedValue(buildSyncResult());

    const exportedSnapshot = emptyCanonicalPayload({
      roles: [
        {
          key: 'pre-existing',
          name: 'Pre-existing',
          description: null,
          groups: [],
          permissions: [],
          tags: [],
          primaryTag: null,
          metadata: null,
        },
      ],
    });
    mocks.exportProjectCdm.mockResolvedValue(exportedSnapshot);

    const callOrder: string[] = [];
    mocks.exportProjectCdm.mockImplementation(async () => {
      callOrder.push('export');
      return exportedSnapshot;
    });
    mocks.saveSnapshot.mockImplementation(async () => {
      callOrder.push('saveSnapshot');
    });
    mocks.importProjectCdm.mockImplementation(async () => {
      callOrder.push('sync');
      return buildSyncResult();
    });

    const job = buildJobInstance(mocks);
    await job.execute({
      jobId: 'queue-job-snap',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    });

    expect(callOrder).toEqual(['export', 'saveSnapshot', 'sync']);

    expect(mocks.exportProjectCdm).toHaveBeenCalledTimes(1);
    const exportArgs = mocks.exportProjectCdm.mock.calls[0];
    expect(exportArgs[0]).toMatchObject({
      projectId,
      scope: enqueueScope,
      version: 1,
    });
    expect(exportArgs[1]).toMatchObject({ __mockTx: true });

    expect(mocks.saveSnapshot).toHaveBeenCalledTimes(1);
    const saveArgs = mocks.saveSnapshot.mock.calls[0];
    expect(saveArgs[0]).toMatchObject({
      jobId: jobRecordId,
      snapshot: exportedSnapshot,
    });
    expect(saveArgs[0].takenAt).toBeInstanceOf(Date);
    expect(saveArgs[1]).toMatchObject({ __mockTx: true });

    const syncTx = mocks.importProjectCdm.mock.calls[0][1];
    expect(syncTx).toMatchObject({ __mockTx: true });
  });

  it('rolls back the snapshot when sync fails (snapshot save and sync share the same transaction)', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData());
    mocks.importProjectCdm.mockRejectedValue(new Error('sync exploded'));

    const job = buildJobInstance(mocks);
    await expect(
      job.execute({
        jobId: 'queue-job-rollback',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: { jobRecordId },
      })
    ).rejects.toThrow('sync exploded');

    /**
     * Both calls happen inside the same DrizzleTransactionalConnection.withTransaction
     * block; the worker rethrows and `markFailed` runs after the transaction
     * boundary. The mocked transaction does not actually roll back, but in
     * production the throw propagates out of withTransaction and Postgres
     * undoes the snapshot write — this test pins the contract that snapshot
     * persistence happens BEFORE sync inside the same tx, which is the only
     * structural guarantee the unit test can assert.
     */
    expect(mocks.exportProjectCdm).toHaveBeenCalledTimes(1);
    expect(mocks.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.markFailed).toHaveBeenCalledWith(
      {
        jobId: jobRecordId,
        errorMessage: 'sync exploded',
        errorDetails: expect.objectContaining({ message: 'sync exploded' }),
      },
      mockOuterTx
    );
  });

  it('marks the job failed, rethrows, and skips cache invalidation when sync errors', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData());
    const boom = new Error('replace failed');
    mocks.importProjectCdm.mockRejectedValue(boom);

    const job = buildJobInstance(mocks);

    await expect(
      job.execute({
        jobId: 'queue-job-2',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: { jobRecordId },
      })
    ).rejects.toThrow('replace failed');

    expect(mocks.transitionToRunning).toHaveBeenCalledOnce();
    expect(mocks.markFailed).toHaveBeenCalledWith(
      {
        jobId: jobRecordId,
        errorMessage: 'replace failed',
        errorDetails: expect.objectContaining({ message: 'replace failed' }),
      },
      mockOuterTx
    );
    expect(mocks.markCompleted).not.toHaveBeenCalled();
    expect(mocks.invalidateCachesForImportResult).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the job is not in PENDING (illegal transition)', async () => {
    mocks.loadForExecution.mockResolvedValue(
      buildExecData({ status: ProjectSyncJobStatus.Completed })
    );

    const job = buildJobInstance(mocks);

    await expect(
      job.execute({
        jobId: 'queue-job-3',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: { jobRecordId },
      })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.transitionToRunning).not.toHaveBeenCalled();
    expect(mocks.importProjectCdm).not.toHaveBeenCalled();
  });

  it('returns success without executing when the job was cancelled before pickup', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData({ cancelRequested: true }));

    const job = buildJobInstance(mocks);
    const outcome = await job.execute({
      jobId: 'queue-job-4',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope: enqueueScope,
      payload: { jobRecordId },
    });

    expect(outcome.success).toBe(true);
    expect(mocks.transitionToRunning).not.toHaveBeenCalled();
    expect(mocks.importProjectCdm).not.toHaveBeenCalled();
    expect(mocks.markCompleted).not.toHaveBeenCalled();
  });

  it('rejects with descriptive error when payload is missing jobRecordId', async () => {
    const job = buildJobInstance(mocks);
    await expect(
      job.execute({
        jobId: 'queue-job-5',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: enqueueScope,
        payload: {},
      })
    ).rejects.toThrow(/jobRecordId/);
    expect(mocks.loadForExecution).not.toHaveBeenCalled();
  });

  it('rejects when the enqueue scope does not match the persisted job scope', async () => {
    mocks.loadForExecution.mockResolvedValue(buildExecData());

    const wrongScope: Scope = {
      tenant: Tenant.OrganizationProject,
      id: 'other-org:other-project',
    };
    const job = buildJobInstance(mocks);
    await expect(
      job.execute({
        jobId: 'queue-job-6',
        scheduledAt: new Date(),
        startedAt: new Date(),
        scope: wrongScope,
        payload: { jobRecordId },
      })
    ).rejects.toThrow(/scope mismatch/);
    expect(mocks.transitionToRunning).not.toHaveBeenCalled();
  });
});
