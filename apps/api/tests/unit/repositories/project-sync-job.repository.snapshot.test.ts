/**
 * Unit tests for ProjectSyncJobRepository snapshot read/write paths.
 *
 *   - `updateSnapshot` writes the JSONB snapshot, takenAt, and sizeBytes
 *     columns and surfaces a NotFoundError when the job row is missing.
 *   - `getSnapshotById` reads back the snapshot row and returns null when the
 *     stored snapshot is null (e.g. legacy jobs enqueued before the column
 *     existed).
 *   - `toEntity` exposes `hasSnapshot` derived from the JSONB column being
 *     non-null on full-row reads (`getById`). List queries use a slim projection
 *     with `snapshot IS NOT NULL` and omit payload/snapshot/result blobs.
 */
import type { DbSchema } from '@grantjs/database';
import { CdmModeStrategy, type SyncProjectInput } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/lib/errors';
import { ProjectSyncJobRepository } from '@/repositories/project-sync-job.repository';

const jobId = '40000000-0000-4000-8000-000000000077';
const projectId = '00000000-0000-4000-8000-000000000011';

interface ChainCall {
  method: string;
  args: unknown[];
}

function buildChainable<T = unknown>(resolveTo: T) {
  const calls: ChainCall[] = [];
  const target = {} as Record<string, unknown>;
  const proxy: unknown = new Proxy(target, {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve: (value: T) => unknown) => Promise.resolve(resolveTo).then(resolve);
      }
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return proxy;
      };
    },
  });
  return { chain: proxy as never, calls };
}

const sampleSnapshot: SyncProjectInput = {
  version: 1,
  id: null,
  mode: {
    strategy: CdmModeStrategy.Merge,
    onConflict: null,
    confirmDestructive: false,
  },
  roles: [
    {
      key: 'role-1',
      name: 'Existing role',
      description: null,
      groups: [],
      permissions: [],
      tags: [],
      primaryTag: null,
      metadata: null,
    },
  ],
  users: [],
  resources: [],
  permissions: [],
  groups: [],
  tags: [],
};

describe('ProjectSyncJobRepository.updateSnapshot', () => {
  let updateChain: ReturnType<typeof buildChainable>;
  let db: DbSchema;
  let repo: ProjectSyncJobRepository;

  function setup(returnedRows: unknown[]) {
    updateChain = buildChainable(returnedRows);
    db = {
      update: vi.fn((...args: unknown[]) => {
        updateChain.calls.push({ method: 'update', args });
        return updateChain.chain;
      }),
    } as unknown as DbSchema;
    repo = new ProjectSyncJobRepository(db);
  }

  beforeEach(() => {
    setup([{ id: jobId }]);
  });

  it('writes snapshot, snapshotTakenAt, snapshotSizeBytes, and updatedAt to the row', async () => {
    const takenAt = new Date('2026-05-02T10:00:00.000Z');
    await repo.updateSnapshot({
      jobId,
      snapshot: sampleSnapshot,
      takenAt,
      sizeBytes: 1234,
    });

    const setCall = updateChain.calls.find((c) => c.method === 'set');
    expect(setCall).toBeDefined();
    const payload = setCall!.args[0] as Record<string, unknown>;
    expect(payload.snapshot).toEqual(sampleSnapshot);
    expect(payload.snapshotTakenAt).toBe(takenAt);
    expect(payload.snapshotSizeBytes).toBe(1234);
    expect(payload.updatedAt).toBeInstanceOf(Date);
  });

  it('throws NotFoundError when no row matches the jobId', async () => {
    setup([]);
    await expect(
      repo.updateSnapshot({
        jobId,
        snapshot: sampleSnapshot,
        takenAt: new Date(),
        sizeBytes: 100,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ProjectSyncJobRepository.getSnapshotById', () => {
  let selectChain: ReturnType<typeof buildChainable>;
  let db: DbSchema;
  let repo: ProjectSyncJobRepository;

  function setup(rows: unknown[]) {
    selectChain = buildChainable(rows);
    db = {
      select: vi.fn((...args: unknown[]) => {
        selectChain.calls.push({ method: 'select', args });
        return selectChain.chain;
      }),
    } as unknown as DbSchema;
    repo = new ProjectSyncJobRepository(db);
  }

  it('returns the stored snapshot row mapped to ProjectSyncJobSnapshotRow shape', async () => {
    const takenAt = new Date('2026-05-02T10:00:00.000Z');
    setup([
      {
        snapshot: sampleSnapshot,
        snapshotTakenAt: takenAt,
        snapshotSizeBytes: 1234,
        projectId,
      },
    ]);

    const result = await repo.getSnapshotById(jobId);

    expect(result).toEqual({
      snapshot: sampleSnapshot,
      takenAt,
      sizeBytes: 1234,
      projectId,
    });
  });

  it('returns null when no row matches', async () => {
    setup([]);
    expect(await repo.getSnapshotById(jobId)).toBeNull();
  });

  it('returns null when the row exists but the snapshot column is null (legacy job)', async () => {
    setup([
      {
        snapshot: null,
        snapshotTakenAt: null,
        snapshotSizeBytes: null,
        projectId,
      },
    ]);
    expect(await repo.getSnapshotById(jobId)).toBeNull();
  });
});
