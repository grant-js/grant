import type { DbSchema } from '@grantjs/database';
import { describe, expect, it, vi } from 'vitest';

import {
  isProjectLinkedKind,
  PROJECT_LINKED_KINDS,
  ProjectLinksRepository,
} from '@/repositories/project-links.repository';

const projectA = '10000000-0000-4000-8000-0000000000a1';
const projectB = '10000000-0000-4000-8000-0000000000b2';

/** A db whose every select().from().where() resolves to the next queued row set. */
function buildDb(...rowSets: Array<Array<{ projectId: string }>>) {
  const queue = [...rowSets];
  const select = vi.fn(() => ({
    from: () => ({ where: () => Promise.resolve(queue.shift() ?? []) }),
  }));
  return { db: { select } as unknown as DbSchema, select };
}

describe('ProjectLinksRepository', () => {
  it('knows exactly the kinds that have a project pivot', () => {
    expect([...PROJECT_LINKED_KINDS].sort()).toEqual([
      'apiKey',
      'group',
      'permission',
      'resource',
      'role',
    ]);
    expect(isProjectLinkedKind('role')).toBe(true);
    expect(isProjectLinkedKind('user')).toBe(false);
  });

  it.each(['role', 'group', 'permission', 'resource'] as const)(
    'reads one pivot for a %s and returns every linked project once',
    async (kind) => {
      const { db, select } = buildDb([
        { projectId: projectA },
        { projectId: projectB },
        { projectId: projectA },
      ]);

      await expect(
        new ProjectLinksRepository(db).getLinkedProjectIds(
          kind,
          '10000000-0000-4000-8000-0000000000e1'
        )
      ).resolves.toEqual([projectA, projectB]);
      expect(select).toHaveBeenCalledTimes(1);
    }
  );

  it('reads the three API-key pivots and merges them', async () => {
    const { db, select } = buildDb(
      [{ projectId: projectA }],
      [{ projectId: projectB }],
      [{ projectId: projectA }]
    );

    await expect(
      new ProjectLinksRepository(db).getLinkedProjectIds(
        'apiKey',
        '10000000-0000-4000-8000-0000000000e2'
      )
    ).resolves.toEqual([projectA, projectB]);
    expect(select).toHaveBeenCalledTimes(3);
  });

  it('returns an empty list for an entity linked to no project', async () => {
    const { db } = buildDb([]);

    await expect(
      new ProjectLinksRepository(db).getLinkedProjectIds(
        'role',
        '10000000-0000-4000-8000-0000000000e3'
      )
    ).resolves.toEqual([]);
  });

  it('runs under the caller transaction when given one', async () => {
    const { db, select } = buildDb();
    const { db: tx, select: txSelect } = buildDb([{ projectId: projectA }]);

    await expect(
      new ProjectLinksRepository(db).getLinkedProjectIds(
        'role',
        '10000000-0000-4000-8000-0000000000e3',
        tx as never
      )
    ).resolves.toEqual([projectA]);
    expect(select).not.toHaveBeenCalled();
    expect(txSelect).toHaveBeenCalledTimes(1);
  });

  // A rejected query would abort the transaction of the write being published.
  it('does not query for an id that is not a uuid', async () => {
    const { db, select } = buildDb([{ projectId: projectA }]);

    await expect(
      new ProjectLinksRepository(db).getLinkedProjectIds('role', 'not-a-uuid')
    ).resolves.toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });
});
