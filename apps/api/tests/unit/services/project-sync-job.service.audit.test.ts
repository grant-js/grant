/**
 * Ensures project sync job lifecycle writes append-only audit rows.
 */
import type { IAuditLogger, IEventPublisher } from '@grantjs/core';
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

function buildJob(overrides: Partial<{ status: ProjectSyncJobStatus }> = {}) {
  return {
    id: jobId,
    projectId,
    status: overrides.status ?? ProjectSyncJobStatus.Pending,
    cdmVersion: 1,
    jobName: null as string | null,
    operation: ProjectSyncJobOperation.Import,
    modeStrategy: CdmModeStrategy.Merge,
    result: null,
    warnings: [] as string[],
    errorMessage: null as string | null,
    enqueuedAt: new Date(),
    startedAt: null as Date | null,
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

describe('ProjectSyncJobService audit', () => {
  it('records CREATE after enqueue', async () => {
    const inserted = buildJob();
    const repo = {
      insert: vi.fn().mockResolvedValue(inserted),
    };
    const audit = noopAudit();
    const svc = new ProjectSyncJobService(repo as never, audit, noopEvents());

    await svc.create({
      projectId,
      scope: { tenant: Tenant.AccountProject, id: `acct:${projectId}` },
      cdmVersion: 1,
      jobName: null,
      operation: 'import',
      modeStrategy: 'merge',
      payload: {
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
      },
      enqueuedById: '30000000-0000-4000-8000-000000000099',
    });

    expect(audit.logCreate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(audit.logCreate).mock.calls[0][0]).toBe(jobId);
    expect(vi.mocked(audit.logCreate).mock.calls[0][1]).toMatchObject({
      status: ProjectSyncJobStatus.Pending,
      projectId,
      cdmVersion: 1,
    });
  });

  it('records UPDATE when transitioning to RUNNING', async () => {
    const pending = buildJob({ status: ProjectSyncJobStatus.Pending });
    const running = buildJob({ status: ProjectSyncJobStatus.Running });
    running.startedAt = new Date();

    const repo = {
      getById: vi.fn().mockResolvedValueOnce(pending),
      updateStatus: vi.fn().mockResolvedValue(running),
    };
    const audit = noopAudit();
    const svc = new ProjectSyncJobService(repo as never, audit, noopEvents());

    await svc.transitionToRunning({ jobId });

    expect(audit.logUpdate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(audit.logUpdate).mock.calls[0][3]).toMatchObject({
      transition: 'PENDING_TO_RUNNING',
    });
  });

  it('records CANCEL_REQUESTED for a running job', async () => {
    const running = buildJob({ status: ProjectSyncJobStatus.Running });
    const updated = { ...running };

    const repo = {
      getById: vi.fn().mockResolvedValue(running),
      updateStatus: vi.fn().mockResolvedValue(updated),
    };
    const audit = noopAudit();
    const svc = new ProjectSyncJobService(repo as never, audit, noopEvents());

    await svc.cancel({ projectId, jobId });

    expect(audit.logAction).toHaveBeenCalledTimes(1);
    expect(vi.mocked(audit.logAction).mock.calls[0][0]).toMatchObject({
      entityId: jobId,
      action: 'CANCEL_REQUESTED',
    });
  });
});
