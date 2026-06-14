import type { DbSchema } from '@grantjs/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectImportRepository } from '@/repositories/project-import.repository';

const projectId = '10000000-0000-4000-8000-000000000011';
const tagId = '20000000-0000-4000-8000-000000000022';
const permissionId = '30000000-0000-4000-8000-000000000033';
const roleId = '40000000-0000-4000-8000-000000000044';
const groupId = '50000000-0000-4000-8000-000000000055';

function buildSelectChain(rows: Array<{ id: string }>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockResolvedValue(rows);
  return chain;
}

function buildDb(selectRows: Array<{ id: string }> = [{ id: 'pivot-row-1' }]) {
  const selectChain = buildSelectChain(selectRows);
  const db = {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return { db: db as unknown as DbSchema, selectChain };
}

describe('ProjectImportRepository CDM pivot teardown', () => {
  let repo: ProjectImportRepository;
  let staggerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const { db } = buildDb();
    repo = new ProjectImportRepository(db);
    staggerSpy = vi
      .spyOn(
        repo as unknown as {
          softDeleteRowsByIdWithStaggeredDeletedAt: (
            table: unknown,
            rowIds: readonly string[],
            transaction?: unknown
          ) => Promise<void>;
        },
        'softDeleteRowsByIdWithStaggeredDeletedAt'
      )
      .mockResolvedValue(undefined);
  });

  it('bulkSoftDeleteCdmTags soft-deletes extended tag pivot tables', async () => {
    await repo.bulkSoftDeleteCdmTags([tagId], projectId);

    expect(staggerSpy).toHaveBeenCalledTimes(7);
  });

  it('bulkSoftDeleteCdmTags is a no-op for empty tag ids', async () => {
    await repo.bulkSoftDeleteCdmTags([], projectId);

    expect(staggerSpy).not.toHaveBeenCalled();
  });

  it('bulkSoftDeleteCdmPermissions soft-deletes assignment pivots and uses stagger for project_permissions', async () => {
    await repo.bulkSoftDeleteCdmPermissions([permissionId], projectId);

    expect(staggerSpy).toHaveBeenCalledTimes(7);
  });

  it('bulkSoftDeleteCdmPermissions is a no-op for empty permission ids', async () => {
    await repo.bulkSoftDeleteCdmPermissions([], projectId);

    expect(staggerSpy).not.toHaveBeenCalled();
  });

  it('bulkSoftDeletePivotsForRoles soft-deletes role assignment pivots', async () => {
    await repo.bulkSoftDeletePivotsForRoles([roleId], projectId);

    expect(staggerSpy).toHaveBeenCalledTimes(2);
  });

  it('bulkSoftDeletePivotsForGroups soft-deletes group assignment pivots', async () => {
    await repo.bulkSoftDeletePivotsForGroups([groupId], projectId);

    expect(staggerSpy).toHaveBeenCalledTimes(2);
  });

  it('resetStaggerSoftDeleteEpoch clears the monotonic base offset', () => {
    (repo as unknown as { staggerSoftDeleteBaseMicros: number }).staggerSoftDeleteBaseMicros = 64;
    repo.resetStaggerSoftDeleteEpoch();
    expect(
      (repo as unknown as { staggerSoftDeleteBaseMicros: number }).staggerSoftDeleteBaseMicros
    ).toBe(0);
  });

  it('advances stagger epoch across consecutive batches', async () => {
    const { db } = buildDb([{ id: 'row-a' }, { id: 'row-b' }]);
    const liveRepo = new ProjectImportRepository(db);
    liveRepo.resetStaggerSoftDeleteEpoch();

    await liveRepo.bulkSoftDeletePivotsForGroups([groupId], projectId);
    expect(
      (liveRepo as unknown as { staggerSoftDeleteBaseMicros: number }).staggerSoftDeleteBaseMicros
    ).toBe(4);

    await liveRepo.bulkSoftDeletePivotsForGroups([groupId], projectId);
    expect(
      (liveRepo as unknown as { staggerSoftDeleteBaseMicros: number }).staggerSoftDeleteBaseMicros
    ).toBe(8);
  });
});
