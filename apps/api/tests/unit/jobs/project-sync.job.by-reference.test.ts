/**
 * The worker's half of a CDM import by reference (ADR 0009): read the document out of the
 * store, hold it to the same schema and rules as an inline body, refuse what cannot be
 * applied *before* the import transaction opens, and delete the object when the job ends.
 *
 * The transactional connection is mocked, as in `project-sync.job.test.ts`, so these assert the
 * order and the outcomes rather than SQL.
 */
import { ConflictError, NotFoundError, PayloadTooLargeError } from '@grantjs/core';
import {
  CdmFindBy,
  CdmModeStrategy,
  ProjectSyncJobOperation,
  ProjectSyncJobStatus,
  type Scope,
  Tenant,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectSyncJob from '@/jobs/project-sync.job';
import { CdmImportRefusal, CdmImportRefusedError } from '@/lib/cdm/cdm-import-upload.lib';
import type { AppContext } from '@/types';

const limits = vi.hoisted(() => ({ maxEntities: 5, maxBytes: 1024 * 1024 }));

vi.mock('@/config', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/config')>();
  return {
    ...mod,
    config: {
      ...mod.config,
      cdm: {
        ...mod.config.cdm,
        get maxImportEntities() {
          return limits.maxEntities;
        },
      },
      storage: {
        ...mod.config.storage,
        cdmImport: {
          ...mod.config.storage.cdmImport,
          get maxBytes() {
            return limits.maxBytes;
          },
        },
      },
    },
  };
});

vi.mock('@/lib/jobs/tenant-job.validation', () => ({
  assertTenantActive: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rls', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/rls')>();
  return { ...mod, setRlsContext: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('@/lib/transaction-manager.lib', () => ({
  DrizzleTransactionalConnection: class {
    async withTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn({ __mockTx: true });
    }
  },
}));

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const jobRecordId = '40000000-0000-4000-8000-000000000077';
const uploadPath = `imports/projects/${projectId}/123e4567-e89b-42d3-a456-426614174077.json`;
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const mockOuterTx = { __outerTx: true };

const merge = { strategy: 'merge', onConflict: null, confirmDestructive: false };

/** A document of exactly `roles` role entities plus one user, so `roles + 1` entities. */
function document(roles = 2, overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    mode: merge,
    roles: Array.from({ length: roles }, (_, i) => ({ key: `role-${i}`, name: `Role ${i}` })),
    users: [{ key: { value: userId, findBy: CdmFindBy.Id }, name: 'User', roles: ['role-0'] }],
    ...overrides,
  };
}

const asBytes = (value: unknown) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));

function execData(
  overrides: Partial<{
    status: ProjectSyncJobStatus;
    cancelRequested: boolean;
    modeStrategy: string;
  }> = {}
) {
  return {
    job: {
      id: jobRecordId,
      projectId,
      status: overrides.status ?? ProjectSyncJobStatus.Pending,
      cdmVersion: 1,
      jobName: null,
      operation: ProjectSyncJobOperation.Import,
      modeStrategy: overrides.modeStrategy ?? CdmModeStrategy.Merge,
    },
    payload: null,
    payloadRef: { path: uploadPath, sizeBytes: 1234, entityCountHint: 3 },
    scope,
    cancelRequested: overrides.cancelRequested ?? false,
  };
}

const syncResult = { rolesCreated: 1, groupsCreated: 0, userRolesAssigned: 1, warnings: [] };

function build() {
  const calls: string[] = [];
  const track = <T>(name: string, impl: (...args: never[]) => T) =>
    vi.fn((...args: never[]) => {
      calls.push(name);
      return impl(...args);
    });

  const mocks = {
    loadForExecution: vi.fn(),
    transitionToRunning: track('transitionToRunning', async () => undefined),
    markCompleted: track('markCompleted', async () => undefined),
    markFailed: track('markFailed', async () => undefined),
    saveSnapshot: track('saveSnapshot', async () => undefined),
    importProjectCdm: track('importProjectCdm', async () => syncResult),
    invalidateCachesForImportResult: vi.fn().mockResolvedValue(undefined),
    exportProjectCdm: track('exportProjectCdm', async () => ({})),
    download: track('download', async () => asBytes(document())),
    delete: track('delete', async () => undefined),
    getUrl: vi.fn(),
  };

  const appContext = {
    db: { transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockOuterTx)) },
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
      projectExport: { exportProjectCdm: mocks.exportProjectCdm },
      fileStorage: { download: mocks.download, delete: mocks.delete, getUrl: mocks.getUrl },
    },
  } as unknown as AppContext;

  const job = new ProjectSyncJob(appContext);
  const run = () =>
    job.execute({
      jobId: 'queue-job',
      scheduledAt: new Date(),
      startedAt: new Date(),
      scope,
      payload: { jobRecordId },
    });
  return { mocks, run, calls };
}

/** The message `markFailed` was given, which is what a polling client reads. */
function failureMessage(mocks: ReturnType<typeof build>['mocks']): string {
  const [params] = mocks.markFailed.mock.calls[0] as unknown as [{ errorMessage: string }];
  return params.errorMessage;
}

/** What must never have happened when a document is refused: no snapshot, no import. */
function expectNothingApplied(mocks: ReturnType<typeof build>['mocks']) {
  expect(mocks.exportProjectCdm).not.toHaveBeenCalled();
  expect(mocks.saveSnapshot).not.toHaveBeenCalled();
  expect(mocks.importProjectCdm).not.toHaveBeenCalled();
  expect(mocks.markCompleted).not.toHaveBeenCalled();
}

describe('ProjectSyncJob, importing by reference', () => {
  beforeEach(() => {
    limits.maxEntities = 5;
    limits.maxBytes = 1024 * 1024;
  });

  describe('a document that may be applied', () => {
    it('downloads it with the policy cap, imports it exactly as inline, and deletes it', async () => {
      const { mocks, run, calls } = build();
      mocks.loadForExecution.mockResolvedValue(execData());

      const outcome = await run();

      expect(outcome.success).toBe(true);
      expect(mocks.download).toHaveBeenCalledWith(uploadPath, { maxBytes: limits.maxBytes });
      expect(mocks.importProjectCdm).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          scope,
          input: expect.objectContaining({ version: 1, mode: merge }),
        }),
        expect.anything()
      );
      expect(mocks.markCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: jobRecordId, result: syncResult }),
        mockOuterTx
      );
      expect(mocks.delete).toHaveBeenCalledWith(uploadPath);
      expect(mocks.markFailed).not.toHaveBeenCalled();
      // Claim the job, then read the document, then apply it; delete only once it is done.
      expect(calls).toEqual([
        'transitionToRunning',
        'download',
        'exportProjectCdm',
        'saveSnapshot',
        'importProjectCdm',
        'markCompleted',
        'delete',
      ]);
    });

    it('invalidates caches for the users in the downloaded document, not the (empty) row', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());

      await run();

      expect(mocks.invalidateCachesForImportResult).toHaveBeenCalledWith({
        scope,
        userIds: [userId],
      });
    });

    it('never asks the store for a URL to the document', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());

      await run();

      expect(mocks.getUrl).not.toHaveBeenCalled();
    });

    it('accepts exactly the cap, and refuses one over', async () => {
      // 4 roles + 1 user = 5 entities = the cap.
      const atCap = build();
      atCap.mocks.loadForExecution.mockResolvedValue(execData());
      atCap.mocks.download.mockResolvedValue(asBytes(document(4)));
      await expect(atCap.run()).resolves.toMatchObject({ success: true });

      const over = build();
      over.mocks.loadForExecution.mockResolvedValue(execData());
      over.mocks.download.mockResolvedValue(asBytes(document(5)));
      await expect(over.run()).rejects.toBeInstanceOf(CdmImportRefusedError);
    });

    it('treats a cap of 0 as unlimited', async () => {
      limits.maxEntities = 0;
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes(document(500)));

      await expect(run()).resolves.toMatchObject({ success: true });
      expect(mocks.importProjectCdm).toHaveBeenCalledTimes(1);
    });

    it('keeps `searchable` from the file, which the REST body schema used to drop', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(
        asBytes(document(1, { roles: [{ key: 'r', name: 'R', searchable: ['x'] }] }))
      );

      await run();

      expect(mocks.importProjectCdm).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            roles: [expect.objectContaining({ searchable: ['x'] })],
          }),
        }),
        expect.anything()
      );
    });
  });

  describe('a document that is refused before the import transaction opens', () => {
    it('fails an over-limit document with a specific code, the count and the limit', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes(document(9))); // 10 entities, cap 5

      const error = await run().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CdmImportRefusedError);
      expect((error as CdmImportRefusedError).refusal).toBe(CdmImportRefusal.TooManyEntities);
      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_TOO_MANY_ENTITIES: /);
      expect(failureMessage(mocks)).toContain('10 entities');
      expect(failureMessage(mocks)).toContain('CDM_IMPORT_MAX_ENTITIES');
      expect(mocks.markFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          errorDetails: expect.objectContaining({
            code: CdmImportRefusal.TooManyEntities,
            details: { entityCount: 10, limit: 5 },
          }),
        }),
        mockOuterTx
      );
      expectNothingApplied(mocks);
    });

    it('does not trust the hint: a small hint on a large document is still refused', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue({
        ...execData(),
        payloadRef: { path: uploadPath, sizeBytes: 10, entityCountHint: 1 },
      });
      mocks.download.mockResolvedValue(asBytes(document(50)));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);
      expectNothingApplied(mocks);
    });

    it('fails a document that is not JSON', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes('{"version": 1, '));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_DOCUMENT_NOT_JSON: /);
      expectNothingApplied(mocks);
    });

    it('fails a document that is JSON but not a CDM document, naming the path', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(
        asBytes({ version: 1, mode: merge, roles: [{ name: 'x' }] })
      );

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_DOCUMENT_INVALID: /);
      expect(failureMessage(mocks)).toContain('roles.0.key');
      expect(failureMessage(mocks)).toContain('users');
      expectNothingApplied(mocks);
    });

    it('holds the file to the inline rules: a duplicate role key is refused', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(
        asBytes(
          document(0, {
            roles: [
              { key: 'dup', name: 'A' },
              { key: 'dup', name: 'B' },
            ],
          })
        )
      );

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(
        /^CDM_IMPORT_DOCUMENT_INVALID: .*Duplicate role key: dup/
      );
      expectNothingApplied(mocks);
    });

    it('holds the file to the inline rules: an unsupported version is refused', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes(document(1, { version: 2 })));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/Unsupported version/);
      expectNothingApplied(mocks);
    });

    it('refuses a document whose mode is not the one requested', async () => {
      // The request was confirmed as a merge. A file saying replace must not widen that.
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData({ modeStrategy: CdmModeStrategy.Merge }));
      mocks.download.mockResolvedValue(
        asBytes(document(1, { mode: { strategy: 'replace', confirmDestructive: true } }))
      );

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_REQUEST_MISMATCH: .*'replace'.*'merge'/);
      expectNothingApplied(mocks);
    });

    it('refuses a document whose version is not the one requested', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue({
        ...execData(),
        job: { ...execData().job, cdmVersion: 7 },
      });

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_REQUEST_MISMATCH: .*version/);
      expectNothingApplied(mocks);
    });

    it('fails a document that has vanished (expired or deleted)', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(new NotFoundError('File', uploadPath));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_UPLOAD_MISSING: /);
      expectNothingApplied(mocks);
    });

    it('fails a document the store says is over the cap, without buffering it', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(
        new PayloadTooLargeError('too big', limits.maxBytes, limits.maxBytes + 1)
      );

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_DOCUMENT_TOO_LARGE: /);
      expectNothingApplied(mocks);
    });

    it('fails, with its own code, when the store itself fails', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(new Error('socket hang up'));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(failureMessage(mocks)).toMatch(/^CDM_IMPORT_STORAGE_FAILURE: /);
      expectNothingApplied(mocks);
    });

    it('leaves the object in place when the store itself failed, so a retry can find it', async () => {
      // The store not answering is no verdict on the document. Every other refusal below deletes.
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(new Error('socket hang up'));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(mocks.markFailed).toHaveBeenCalledTimes(1);
      expect(mocks.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['vanished', () => new NotFoundError('File', uploadPath)],
      ['over the cap', () => new PayloadTooLargeError('big', limits.maxBytes, limits.maxBytes + 1)],
    ])('still deletes the object when the download says it %s', async (_label, failure) => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(failure());

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(mocks.delete).toHaveBeenCalledWith(uploadPath);
    });

    it('keeps a duplicated user key out of the stored message, the details and the event', async () => {
      // An email is the usual user key. The inline 400 may echo it; the job row and the
      // project_sync.failed event it feeds must not.
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      const dup = { key: { value: 'jane.doe@example.com', findBy: CdmFindBy.Email }, name: 'J' };
      mocks.download.mockResolvedValue(asBytes(document(1, { users: [dup, dup] })));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      const [params] = mocks.markFailed.mock.calls[0] as unknown as [
        { errorMessage: string; errorDetails: unknown },
      ];
      expect(params.errorMessage).toBe(
        'CDM_IMPORT_DOCUMENT_INVALID: Duplicate user key at users[1]'
      );
      expect(JSON.stringify(params)).not.toContain('jane.doe');
    });

    it.each([
      ['over the entity cap', () => asBytes(document(9))],
      ['not JSON', () => asBytes('nope')],
      ['not a document', () => asBytes({})],
    ])('deletes the object of a document that was %s', async (_label, bytes) => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(bytes());

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(mocks.delete).toHaveBeenCalledWith(uploadPath);
    });
  });

  describe('cleanup at a terminal state', () => {
    it('deletes a refused document before marking the job FAILED, not after', async () => {
      // FAILED releases the upload from the unique index on `payload_path`. Deleting after it
      // leaves a window in which a new start attaches a job to this uploadId and loses its object.
      const { mocks, run, calls } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes(document(9))); // over the cap

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(calls).toEqual(['transitionToRunning', 'delete', 'markFailed']);
    });

    it('deletes the object before marking the job FAILED when the import itself fails', async () => {
      const { mocks, run, calls } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.importProjectCdm.mockRejectedValue(new Error('constraint violation'));

      await expect(run()).rejects.toThrow('constraint violation');

      expect(calls.indexOf('delete')).toBeGreaterThan(calls.indexOf('importProjectCdm'));
      expect(calls.indexOf('delete')).toBeLessThan(calls.indexOf('markFailed'));
      expect(calls.filter((call) => call === 'delete')).toHaveLength(1);
    });

    it('still marks the job FAILED, and never deletes, when the store itself failed', async () => {
      // The one exception: the object is left for a retry, and FAILED is what releases the index.
      const { mocks, run, calls } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockRejectedValue(new Error('socket hang up'));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      expect(calls).toEqual(['transitionToRunning', 'markFailed']);
    });

    it('marks the job FAILED even when the delete throws', async () => {
      const { mocks, run, calls } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes('nope'));
      mocks.delete.mockRejectedValue(new Error('AccessDenied'));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);

      // (the throwing delete replaces the tracked mock, so only the claim and the failure show)
      expect(mocks.delete).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['transitionToRunning', 'markFailed']);
    });

    it('deletes the object when the import itself fails', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.importProjectCdm.mockRejectedValue(new Error('constraint violation'));

      await expect(run()).rejects.toThrow('constraint violation');

      expect(mocks.markFailed).toHaveBeenCalledTimes(1);
      expect(mocks.delete).toHaveBeenCalledWith(uploadPath);
    });

    it('never fails a completed job because the delete failed', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.delete.mockRejectedValue(new Error('AccessDenied'));

      const outcome = await run();

      expect(outcome.success).toBe(true);
      expect(mocks.markCompleted).toHaveBeenCalledTimes(1);
      expect(mocks.markFailed).not.toHaveBeenCalled();
      expect(mocks.invalidateCachesForImportResult).toHaveBeenCalledTimes(1);
    });

    it('never masks a refusal because the delete failed', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.download.mockResolvedValue(asBytes('nope'));
      mocks.delete.mockRejectedValue(new Error('AccessDenied'));

      await expect(run()).rejects.toBeInstanceOf(CdmImportRefusedError);
    });

    it('deletes the object of a job cancelled before it ran, and reads nothing', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(
        execData({ status: ProjectSyncJobStatus.Cancelled })
      );

      const outcome = await run();

      expect(outcome).toMatchObject({ success: true, message: 'Cancelled before execution' });
      expect(mocks.delete).toHaveBeenCalledWith(uploadPath);
      expect(mocks.download).not.toHaveBeenCalled();
      expect(mocks.transitionToRunning).not.toHaveBeenCalled();
    });

    it('leaves the object of a job that is still running, even when cancel was requested', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(
        execData({ status: ProjectSyncJobStatus.Running, cancelRequested: true })
      );

      await run();

      expect(mocks.delete).not.toHaveBeenCalled();
    });
  });

  describe('a redelivered message', () => {
    it('is refused at the claim, before anything is read, failed or deleted', async () => {
      // Another consumer owns this job. Reading, failing or deleting here would act on a job
      // that is mid-import: this is why the document is read after `transitionToRunning`.
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData());
      mocks.transitionToRunning.mockRejectedValue(new ConflictError('already RUNNING'));

      await expect(run()).rejects.toBeInstanceOf(ConflictError);

      expect(mocks.download).not.toHaveBeenCalled();
      expect(mocks.markFailed).not.toHaveBeenCalled();
      expect(mocks.delete).not.toHaveBeenCalled();
    });

    it('is refused for a job that is not pending, and deletes nothing', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue(execData({ status: ProjectSyncJobStatus.Running }));

      await expect(run()).rejects.toBeInstanceOf(ConflictError);

      expect(mocks.download).not.toHaveBeenCalled();
      expect(mocks.delete).not.toHaveBeenCalled();
    });
  });

  describe('an inline job', () => {
    it('does not touch storage at all', async () => {
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue({
        ...execData(),
        payload: document(1),
        payloadRef: null,
      });

      const outcome = await run();

      expect(outcome.success).toBe(true);
      expect(mocks.download).not.toHaveBeenCalled();
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(mocks.importProjectCdm).toHaveBeenCalledTimes(1);
    });

    it('is not held to the entity cap: the cap is the by-reference path’s refusal', async () => {
      // Inline documents are bounded by the request body limit and keep today's synchronous
      // validation; the cap exists because by-reference removed that accident.
      const { mocks, run } = build();
      mocks.loadForExecution.mockResolvedValue({
        ...execData(),
        payload: document(50),
        payloadRef: null,
      });

      await expect(run()).resolves.toMatchObject({ success: true });
    });
  });
});
