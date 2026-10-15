/**
 * Unit tests for ProjectSyncJobService lifecycle transitions (non-audit).
 */
import type { IAuditLogger, IEventPublisher } from '@grantjs/core';
import { ConflictError } from '@grantjs/core';
import {
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  Tenant,
} from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ProjectSyncJobService } from '@/services/project-sync-job.service';

const jobId = '40000000-0000-4000-8000-000000000077';
const projectId = '00000000-0000-4000-8000-000000000011';
const scopeTenant = Tenant.AccountProject;
const scopeId = `acct:${projectId}`;

function buildJob(status: ProjectSyncJobStatus) {
  return {
    id: jobId,
    projectId,
    status,
    cdmVersion: 1,
    jobName: null as string | null,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [] as string[],
    errorMessage: null as string | null,
    enqueuedAt: new Date(),
    startedAt: status === ProjectSyncJobStatus.Running ? new Date() : null,
    completedAt: null as Date | null,
    cancelledAt: null as Date | null,
    hasSnapshot: false,
    snapshotTakenAt: null as Date | null,
    snapshotSizeBytes: null as number | null,
  };
}

function noopAudit(): IAuditLogger {
  return {
    logAction: vi.fn().mockResolvedValue(undefined),
    logCreate: vi.fn().mockResolvedValue(undefined),
    logUpdate: vi.fn().mockResolvedValue(undefined),
    logSoftDelete: vi.fn().mockResolvedValue(undefined),
    logHardDelete: vi.fn().mockResolvedValue(undefined),
  };
}

function noopEvents(): IEventPublisher {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
  };
}

function fullRow(job: ReturnType<typeof buildJob>) {
  return {
    job,
    payload: {},
    scopeTenant,
    scopeId,
    cancelRequested: false,
  };
}

function createService(
  repo: {
    getById?: ReturnType<typeof vi.fn>;
    getFullById?: ReturnType<typeof vi.fn>;
    getPayloadById?: ReturnType<typeof vi.fn>;
    updateStatus?: ReturnType<typeof vi.fn>;
    updatePayload?: ReturnType<typeof vi.fn>;
    insert?: ReturnType<typeof vi.fn>;
  },
  events: IEventPublisher = noopEvents()
) {
  return new ProjectSyncJobService(repo as never, noopAudit(), events);
}

describe('ProjectSyncJobService.cancel', () => {
  it('cancels a PENDING job immediately', async () => {
    const pending = buildJob(ProjectSyncJobStatus.Pending);
    const cancelled = buildJob(ProjectSyncJobStatus.Cancelled);
    const getById = vi.fn().mockResolvedValue(pending);
    const getFullById = vi.fn().mockResolvedValue(fullRow(pending));
    const updateStatus = vi.fn().mockResolvedValue(cancelled);
    const svc = createService({ getById, getFullById, updateStatus });

    const result = await svc.cancel({ projectId, jobId });

    expect(result.status).toBe(ProjectSyncJobStatus.Cancelled);
    expect(updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        status: ProjectSyncJobStatus.Cancelled,
      }),
      undefined
    );
  });

  it('sets cancelRequested on a RUNNING job without changing status', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const getById = vi.fn().mockResolvedValue(running);
    const updateStatus = vi.fn().mockImplementation(async (params) => ({
      ...running,
      status: params.status,
    }));
    const svc = createService({ getById, updateStatus });

    const result = await svc.cancel({ projectId, jobId });

    expect(result.status).toBe(ProjectSyncJobStatus.Running);
    expect(updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        status: ProjectSyncJobStatus.Running,
        cancelRequested: expect.any(Date),
      }),
      undefined
    );
  });

  it('throws ConflictError when cancelling a COMPLETED job', async () => {
    const completed = buildJob(ProjectSyncJobStatus.Completed);
    const svc = createService({
      getById: vi.fn().mockResolvedValue(completed),
      updateStatus: vi.fn(),
    });

    await expect(svc.cancel({ projectId, jobId })).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when cancelling a FAILED job', async () => {
    const failed = buildJob(ProjectSyncJobStatus.Failed);
    const svc = createService({
      getById: vi.fn().mockResolvedValue(failed),
      updateStatus: vi.fn(),
    });

    await expect(svc.cancel({ projectId, jobId })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('ProjectSyncJobService.transitionToRunning', () => {
  it('transitions PENDING to RUNNING', async () => {
    const pending = buildJob(ProjectSyncJobStatus.Pending);
    const running = buildJob(ProjectSyncJobStatus.Running);
    const svc = createService({
      getById: vi.fn().mockResolvedValue(pending),
      updateStatus: vi.fn().mockResolvedValue(running),
    });

    const result = await svc.transitionToRunning({ jobId });

    expect(result.status).toBe(ProjectSyncJobStatus.Running);
  });

  it('throws ConflictError when job is not PENDING', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const svc = createService({
      getById: vi.fn().mockResolvedValue(running),
      updateStatus: vi.fn(),
    });

    await expect(svc.transitionToRunning({ jobId })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('ProjectSyncJobService.markFailed', () => {
  it('marks a RUNNING job as FAILED with error message', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const failed = buildJob(ProjectSyncJobStatus.Failed);
    const updateStatus = vi.fn().mockResolvedValue(failed);
    const events = noopEvents();
    const svc = createService(
      {
        getFullById: vi.fn().mockResolvedValue(fullRow(running)),
        updateStatus,
      },
      events
    );

    const result = await svc.markFailed({ jobId, errorMessage: 'sync exploded' });

    expect(result.status).toBe(ProjectSyncJobStatus.Failed);
    expect(updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ProjectSyncJobStatus.Failed,
        errorMessage: 'sync exploded',
      }),
      undefined
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'project_sync.failed',
        scope: { tenant: scopeTenant, id: scopeId },
        aggregate: { kind: 'project', id: projectId },
        data: {
          after: expect.objectContaining({
            jobId,
            projectId,
            operation: 'import',
            errorMessage: 'sync exploded',
          }),
        },
      }),
      undefined
    );
  });

  it('marks a PENDING job as FAILED', async () => {
    const pending = buildJob(ProjectSyncJobStatus.Pending);
    const failed = buildJob(ProjectSyncJobStatus.Failed);
    const events = noopEvents();
    const svc = createService(
      {
        getFullById: vi.fn().mockResolvedValue(fullRow(pending)),
        updateStatus: vi.fn().mockResolvedValue(failed),
      },
      events
    );

    const result = await svc.markFailed({ jobId, errorMessage: 'never started' });

    expect(result.status).toBe(ProjectSyncJobStatus.Failed);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'project_sync.failed' }),
      undefined
    );
  });

  it('throws ConflictError when marking COMPLETED job as FAILED', async () => {
    const completed = buildJob(ProjectSyncJobStatus.Completed);
    const events = noopEvents();
    const svc = createService(
      {
        getFullById: vi.fn().mockResolvedValue(fullRow(completed)),
        updateStatus: vi.fn(),
      },
      events
    );

    await expect(svc.markFailed({ jobId, errorMessage: 'too late' })).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(events.publish).not.toHaveBeenCalled();
  });
});

describe('ProjectSyncJobService.markCompleted', () => {
  it('publishes project_sync.completed with import counters', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const completed = buildJob(ProjectSyncJobStatus.Completed);
    const events = noopEvents();
    const result = {
      projectId,
      importId: null,
      rolesCreated: 2,
      groupsCreated: 1,
      roleGroupsLinked: 0,
      groupPermissionsLinked: 0,
      projectRolesLinked: 0,
      projectGroupsLinked: 0,
      projectPermissionsLinked: 0,
      projectResourcesLinked: 0,
      projectUsersEnsured: 0,
      usersCreated: 0,
      userRolesAssigned: 3,
      projectUserApiKeysCreated: 0,
      passwordsImported: 0,
      passwordsUpdated: 0,
      passwordsUnchanged: 0,
      passwordsSkippedExisting: 0,
      passwordsSkippedConflict: 0,
      resourcesCreated: 0,
      permissionsCreated: 0,
      tagsCreated: 0,
      projectTagsLinked: 0,
      roleTagsLinked: 0,
      groupTagsLinked: 0,
      userTagsLinked: 0,
      warnings: ['soft warning'],
    };
    const svc = createService(
      {
        getFullById: vi.fn().mockResolvedValue(fullRow(running)),
        updateStatus: vi.fn().mockResolvedValue(completed),
      },
      events
    );

    await svc.markCompleted({
      jobId,
      result,
      warnings: result.warnings,
    });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'project_sync.completed',
        scope: { tenant: scopeTenant, id: scopeId },
        aggregate: { kind: 'project', id: projectId },
        data: {
          after: expect.objectContaining({
            jobId,
            projectId,
            operation: 'import',
            rolesCreated: 2,
            userRolesAssigned: 3,
            warningCount: 1,
          }),
        },
      }),
      undefined
    );
  });
});

describe('ProjectSyncJobService.create validation', () => {
  it('rejects unsupported cdmVersion', async () => {
    const svc = createService({ insert: vi.fn() });

    await expect(
      svc.create({
        projectId,
        scope: { tenant: Tenant.AccountProject, id: `acct:${projectId}` },
        cdmVersion: 2,
        jobName: null,
        operation: 'import',
        modeStrategy: 'merge',
        payload: {},
        enqueuedById: 'user-1',
      })
    ).rejects.toThrow(/cdmVersion/);
  });
});

describe('ProjectSyncJobService imported password hashes (ADR 0010)', () => {
  const HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
  const documentWithHash = () => ({
    version: 1,
    users: [
      {
        key: { value: 'ada@example.com', findBy: 'email' },
        name: 'Ada',
        password: { algorithm: 'bcrypt', hash: HASH },
      },
      { key: { value: 'bob@example.com', findBy: 'email' }, name: 'Bob' },
    ],
  });
  const emptyResult = {
    projectId,
    importId: null,
    rolesCreated: 0,
    groupsCreated: 0,
    roleGroupsLinked: 0,
    groupPermissionsLinked: 0,
    projectRolesLinked: 0,
    projectGroupsLinked: 0,
    projectPermissionsLinked: 0,
    projectResourcesLinked: 0,
    projectUsersEnsured: 0,
    usersCreated: 2,
    userRolesAssigned: 0,
    projectUserApiKeysCreated: 0,
    passwordsImported: 1,
    passwordsUpdated: 0,
    passwordsUnchanged: 0,
    passwordsSkippedExisting: 0,
    passwordsSkippedConflict: 0,
    resourcesCreated: 0,
    permissionsCreated: 0,
    tagsCreated: 0,
    projectTagsLinked: 0,
    roleTagsLinked: 0,
    groupTagsLinked: 0,
    userTagsLinked: 0,
    warnings: [],
  };

  function storedPayloads(updatePayload: ReturnType<typeof vi.fn>): string {
    return JSON.stringify(updatePayload.mock.calls.map((call) => call[0].payload));
  }

  it('removes the hash from the stored payload when the job completes, in the same transaction', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const updatePayload = vi.fn().mockResolvedValue(undefined);
    const tx = {};
    const svc = createService({
      getFullById: vi.fn().mockResolvedValue({ ...fullRow(running), payload: documentWithHash() }),
      updateStatus: vi.fn().mockResolvedValue(buildJob(ProjectSyncJobStatus.Completed)),
      updatePayload,
    });

    await svc.markCompleted({ jobId, result: emptyResult, warnings: [] }, tx as never);

    expect(updatePayload).toHaveBeenCalledTimes(1);
    expect(updatePayload.mock.calls[0][1]).toBe(tx);
    expect(storedPayloads(updatePayload)).not.toContain(HASH);
    expect(updatePayload.mock.calls[0][0].payload.users[0].password.hash).toBe('[redacted]');
    expect(updatePayload.mock.calls[0][0].payload.users[1].name).toBe('Bob');
  });

  it('removes the hash when the job fails', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const updatePayload = vi.fn().mockResolvedValue(undefined);
    const svc = createService({
      getFullById: vi.fn().mockResolvedValue({ ...fullRow(running), payload: documentWithHash() }),
      updateStatus: vi.fn().mockResolvedValue(buildJob(ProjectSyncJobStatus.Failed)),
      updatePayload,
    });

    await svc.markFailed({ jobId, errorMessage: 'boom' });

    expect(storedPayloads(updatePayload)).not.toContain(HASH);
  });

  it('removes the hash when a pending job is cancelled', async () => {
    const pending = buildJob(ProjectSyncJobStatus.Pending);
    const updatePayload = vi.fn().mockResolvedValue(undefined);
    const svc = createService({
      getById: vi.fn().mockResolvedValue(pending),
      getFullById: vi.fn().mockResolvedValue({ ...fullRow(pending), payload: documentWithHash() }),
      updateStatus: vi.fn().mockResolvedValue(buildJob(ProjectSyncJobStatus.Cancelled)),
      updatePayload,
    });

    await svc.cancel({ projectId, jobId });

    expect(storedPayloads(updatePayload)).not.toContain(HASH);
  });

  it('keeps the hash for a running job whose cancellation is only requested', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const updatePayload = vi.fn();
    const svc = createService({
      getById: vi.fn().mockResolvedValue(running),
      updateStatus: vi.fn().mockResolvedValue(running),
      updatePayload,
    });

    await svc.cancel({ projectId, jobId });

    expect(updatePayload).not.toHaveBeenCalled();
  });

  it('does not rewrite a payload that holds no hash', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const updatePayload = vi.fn();
    const svc = createService({
      getFullById: vi.fn().mockResolvedValue({ ...fullRow(running), payload: { users: [] } }),
      updateStatus: vi.fn().mockResolvedValue(buildJob(ProjectSyncJobStatus.Completed)),
      updatePayload,
    });

    await svc.markCompleted({ jobId, result: emptyResult, warnings: [] });

    expect(updatePayload).not.toHaveBeenCalled();
  });

  it('answers /payload without the hash even while the job still holds it', async () => {
    const stored = documentWithHash();
    const svc = createService({
      getPayloadById: vi.fn().mockResolvedValue({
        payload: stored,
        payloadRef: null,
        jobName: null,
        cdmVersion: 1,
        projectId,
      }),
    });

    const answer = await svc.getPayload({ projectId, jobId });

    expect(JSON.stringify(answer)).not.toContain(HASH);
    expect(JSON.stringify(stored)).toContain(HASH);
  });

  it('reports the password counters, and no hash, in the completion event and the audit entry', async () => {
    const running = buildJob(ProjectSyncJobStatus.Running);
    const events = noopEvents();
    const audit = noopAudit();
    const svc = new ProjectSyncJobService(
      {
        getFullById: vi
          .fn()
          .mockResolvedValue({ ...fullRow(running), payload: documentWithHash() }),
        updateStatus: vi.fn().mockResolvedValue(buildJob(ProjectSyncJobStatus.Completed)),
        updatePayload: vi.fn(),
      } as never,
      audit,
      events
    );

    await svc.markCompleted({ jobId, result: emptyResult, warnings: [] });

    const event = (events.publish as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(event.data.after).toEqual(expect.objectContaining({ passwordsImported: 1 }));
    expect(JSON.stringify(event)).not.toContain(HASH);
    expect(JSON.stringify((audit.logUpdate as ReturnType<typeof vi.fn>).mock.calls)).not.toContain(
      HASH
    );
  });
});
