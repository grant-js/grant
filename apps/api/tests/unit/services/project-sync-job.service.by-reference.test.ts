/**
 * ProjectSyncJobService carries a by-reference import's reference through create, the
 * payload read and `loadForExecution` (ADR 0009). It owns no policy about it: the handler decides
 * what may be referenced, and the worker what may be applied.
 */
import type { IAuditLogger, IEventPublisher } from '@grantjs/core';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ProjectSyncJobService } from '@/services/project-sync-job.service';

const jobId = '40000000-0000-4000-8000-000000000077';
const projectId = '00000000-0000-4000-8000-000000000011';
const scope = { tenant: Tenant.AccountProject, id: `acct:${projectId}` };
const ref = {
  path: `imports/projects/${projectId}/123e4567-e89b-42d3-a456-426614174077.json`,
  sizeBytes: 100,
  entityCountHint: null,
};

const audit = {
  logAction: vi.fn(),
  logCreate: vi.fn().mockResolvedValue(undefined),
  logUpdate: vi.fn(),
  logSoftDelete: vi.fn(),
  logHardDelete: vi.fn(),
} as unknown as IAuditLogger;
const events = { publish: vi.fn() } as unknown as IEventPublisher;

describe('ProjectSyncJobService, by reference', () => {
  it('hands the reference to the repository on create', async () => {
    const insert = vi.fn().mockResolvedValue({ id: jobId, projectId, status: 'PENDING' });
    const svc = new ProjectSyncJobService({ insert } as never, audit, events);

    await svc.create({
      projectId,
      scope,
      cdmVersion: 1,
      jobName: null,
      operation: 'import',
      modeStrategy: 'merge',
      payload: null,
      payloadRef: ref,
      enqueuedById: 'u',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ payload: null, payloadRef: ref }),
      undefined
    );
  });

  it('passes no reference for an inline create', async () => {
    const insert = vi.fn().mockResolvedValue({ id: jobId, projectId, status: 'PENDING' });
    const svc = new ProjectSyncJobService({ insert } as never, audit, events);

    await svc.create({
      projectId,
      scope,
      cdmVersion: 1,
      jobName: null,
      operation: 'import',
      modeStrategy: 'merge',
      payload: { version: 1 },
      enqueuedById: 'u',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { version: 1 }, payloadRef: null }),
      undefined
    );
  });

  it('exposes the reference to the worker through loadForExecution', async () => {
    const getFullById = vi.fn().mockResolvedValue({
      job: { id: jobId, projectId },
      payload: null,
      payloadRef: ref,
      scopeTenant: scope.tenant,
      scopeId: scope.id,
      cancelRequested: false,
    });
    const svc = new ProjectSyncJobService({ getFullById } as never, audit, events);

    const data = await svc.loadForExecution({ jobId });

    expect(data.payload).toBeNull();
    expect(data.payloadRef).toEqual(ref);
  });

  it('exposes the reference through getPayload, scoped to the project', async () => {
    const getPayloadById = vi.fn().mockResolvedValue({
      payload: null,
      payloadRef: ref,
      jobName: null,
      cdmVersion: 1,
      projectId,
    });
    const svc = new ProjectSyncJobService({ getPayloadById } as never, audit, events);

    await expect(svc.getPayload({ projectId, jobId })).resolves.toMatchObject({ payloadRef: ref });
    await expect(
      svc.getPayload({ projectId: '00000000-0000-4000-8000-0000000000ff', jobId })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
