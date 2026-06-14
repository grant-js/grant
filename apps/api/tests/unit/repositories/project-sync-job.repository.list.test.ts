import type { DbSchema } from '@grantjs/database';
import { ProjectSyncJobSortableField, ProjectSyncJobStatus, SortOrder } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectSyncJobRepository } from '@/repositories/project-sync-job.repository';

const projectId = '00000000-0000-4000-8000-000000000011';
const accountId = '00000000-0000-4000-8000-000000000020';

interface ChainCall {
  method: string;
  args: unknown[];
}

/**
 * Builds a Drizzle-like awaitable chainable mock. Every method call (select, from,
 * where, orderBy, limit, offset, ...) returns the same proxy and is captured under
 * `calls`. Awaiting the chain resolves to the configured `resolveTo` value.
 */
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

describe('ProjectSyncJobRepository.listByProject', () => {
  let countChain: ReturnType<typeof buildChainable>;
  let dataChain: ReturnType<typeof buildChainable>;
  let db: DbSchema;
  let repo: ProjectSyncJobRepository;

  function buildRepo({
    countResult = [{ value: 0 }],
    dataResult = [],
  }: {
    countResult?: Array<{ value: number }>;
    dataResult?: unknown[];
  }) {
    countChain = buildChainable(countResult);
    dataChain = buildChainable(dataResult);

    let selectCount = 0;
    db = {
      select: vi.fn((...args: unknown[]) => {
        selectCount += 1;
        // Repository constructs `countQuery` first, then `baseSelect`.
        const target = selectCount === 1 ? countChain : dataChain;
        target.calls.push({ method: 'select', args });
        return target.chain;
      }),
    } as unknown as DbSchema;
    repo = new ProjectSyncJobRepository(db);
  }

  beforeEach(() => {
    buildRepo({ countResult: [{ value: 0 }], dataResult: [] });
  });

  it('applies pagination using page and limit', async () => {
    await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
      page: 2,
      limit: 25,
      status: ProjectSyncJobStatus.Pending,
    });

    const limitCall = dataChain.calls.find((c) => c.method === 'limit');
    const offsetCall = dataChain.calls.find((c) => c.method === 'offset');
    const orderCall = dataChain.calls.find((c) => c.method === 'orderBy');

    expect(limitCall?.args[0]).toBe(25);
    expect(offsetCall?.args[0]).toBe(25);
    expect(orderCall).toBeDefined();
  });

  it('caps page size at 200 and clamps page below 1 to 1', async () => {
    await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
      page: 0,
      limit: 999,
    });

    const limitCall = dataChain.calls.find((c) => c.method === 'limit');
    const offsetCall = dataChain.calls.find((c) => c.method === 'offset');

    expect(limitCall?.args[0]).toBe(200);
    expect(offsetCall?.args[0]).toBe(0);
  });

  it('honors a custom sort field/order', async () => {
    await repo.listByProject({
      projectId,
      scopeTenant: 'organizationProject',
      scopeId: `org-1:${projectId}`,
      sort: {
        field: ProjectSyncJobSortableField.CompletedAt,
        order: SortOrder.Asc,
      },
    });

    const orderCall = dataChain.calls.find((c) => c.method === 'orderBy');
    expect(orderCall).toBeDefined();
  });

  it('returns an empty items array when limit is -1 and only runs the count query', async () => {
    buildRepo({ countResult: [{ value: 7 }], dataResult: [] });

    const result = await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
      limit: -1,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(7);
    // limit -1 means the data query never runs; only the count query was selected.
    expect(dataChain.calls).toHaveLength(0);
  });

  it('uses default sort and pagination when none are provided', async () => {
    await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
    });

    const limitCall = dataChain.calls.find((c) => c.method === 'limit');
    const offsetCall = dataChain.calls.find((c) => c.method === 'offset');

    expect(limitCall?.args[0]).toBe(50);
    expect(offsetCall?.args[0]).toBe(0);
  });

  it('selects list columns only and excludes heavy JSONB blobs', async () => {
    await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
    });

    const selectCall = dataChain.calls.find((c) => c.method === 'select');
    expect(selectCall).toBeDefined();
    const columns = selectCall!.args[0] as Record<string, unknown>;
    expect(Object.keys(columns).sort()).toEqual(
      [
        'cancelledAt',
        'cdmVersion',
        'completedAt',
        'createdAt',
        'errorMessage',
        'hasSnapshot',
        'id',
        'jobName',
        'modeStrategy',
        'operation',
        'projectId',
        'snapshotSizeBytes',
        'snapshotTakenAt',
        'startedAt',
        'status',
        'warnings',
      ].sort()
    );
    expect(columns).not.toHaveProperty('payload');
    expect(columns).not.toHaveProperty('snapshot');
    expect(columns).not.toHaveProperty('result');
  });

  it('maps list rows without loading result counters', async () => {
    buildRepo({
      countResult: [{ value: 1 }],
      dataResult: [
        {
          id: '40000000-0000-4000-8000-000000000099',
          projectId,
          status: 'completed',
          cdmVersion: 1,
          jobName: 'nightly-import',
          operation: 'import',
          modeStrategy: 'merge',
          warnings: ['warn-a'],
          errorMessage: null,
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          startedAt: new Date('2026-06-01T12:00:01.000Z'),
          completedAt: new Date('2026-06-01T12:00:05.000Z'),
          cancelledAt: null,
          hasSnapshot: true,
          snapshotTakenAt: new Date('2026-06-01T12:00:02.000Z'),
          snapshotSizeBytes: 2048,
        },
      ],
    });

    const result = await repo.listByProject({
      projectId,
      scopeTenant: 'accountProject',
      scopeId: `${accountId}:${projectId}`,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.result).toBeNull();
    expect(result.items[0]?.hasSnapshot).toBe(true);
    expect(result.items[0]?.jobName).toBe('nightly-import');
  });
});
