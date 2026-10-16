import { describe, expect, it, vi } from 'vitest';

import { MeHandler } from '@/handlers/me.handler';

const userId = '30000000-0000-4000-8000-0000000000c1';
const projectId = '20000000-0000-4000-8000-0000000000c2';
const HASH = '$2b$10$' + 'h'.repeat(53);

function buildHandler(listForUser: ReturnType<typeof vi.fn>) {
  const created = new Date('2026-03-01T10:00:00.000Z');
  return new MeHandler(
    {} as never,
    {} as never,
    {} as never,
    {
      getAccountsByOwnerId: vi.fn().mockResolvedValue([]),
    } as never,
    {
      getUsers: vi.fn().mockResolvedValue({
        users: [{ id: userId, name: 'Exporter', createdAt: created, updatedAt: created }],
      }),
    } as never,
    {
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([
        {
          provider: 'email',
          providerId: 'exporter@example.com',
          isVerified: true,
          isPrimary: true,
          lastUsedAt: null,
          createdAt: created,
        },
      ]),
    } as never,
    {} as never,
    { getUserSessions: vi.fn().mockResolvedValue({ userSessions: [] }) } as never,
    {} as never,
    {} as never,
    { getUserOrganizationMemberships: vi.fn().mockResolvedValue([]) } as never,
    { getUserProjectMemberships: vi.fn().mockResolvedValue([]) } as never,
    { getAuth: () => ({ userId }) } as never,
    {} as never,
    {} as never,
    { listForUser } as never,
    {} as never,
    {} as never,
    { withTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}) } as never
  );
}

describe('MeHandler.myUserDataExport credentials', () => {
  it('lists the existence, scope, source and dates of each credential', async () => {
    const lastUsedAt = new Date('2026-04-01T08:00:00.000Z');
    const createdAt = new Date('2026-03-02T09:00:00.000Z');
    const updatedAt = new Date('2026-03-03T09:00:00.000Z');
    const listForUser = vi.fn().mockResolvedValue([
      {
        id: 'cred-1',
        scope: 'platform',
        projectId: null,
        userId,
        source: 'register',
        lastUsedAt,
        createdAt,
        updatedAt,
      },
      {
        id: 'cred-2',
        scope: 'project',
        projectId,
        userId,
        source: 'cdm-import',
        lastUsedAt: null,
        createdAt,
        updatedAt,
      },
    ]);

    const { data } = await buildHandler(listForUser).myUserDataExport();

    expect(listForUser).toHaveBeenCalledWith(userId);
    expect(data.credentials).toEqual([
      { scope: 'platform', projectId: null, source: 'register', lastUsedAt, createdAt, updatedAt },
      { scope: 'project', projectId, source: 'cdm-import', lastUsedAt: null, createdAt, updatedAt },
    ]);
  });

  it('is an empty list for a user with no credential', async () => {
    const { data } = await buildHandler(vi.fn().mockResolvedValue([])).myUserDataExport();
    expect(data.credentials).toEqual([]);
  });

  it('never exports a hash, even if the service were to hand one over', async () => {
    const createdAt = new Date('2026-03-02T09:00:00.000Z');
    const listForUser = vi.fn().mockResolvedValue([
      {
        id: 'cred-1',
        scope: 'platform',
        projectId: null,
        userId,
        source: 'register',
        hash: HASH,
        lastUsedAt: null,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const { data } = await buildHandler(listForUser).myUserDataExport();

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(HASH);
    expect(serialized).not.toContain('"hash"');
    expect(serialized).not.toContain('$2b$');
    expect(Object.keys(data.credentials[0]).sort()).toEqual(
      ['createdAt', 'lastUsedAt', 'projectId', 'scope', 'source', 'updatedAt'].sort()
    );
  });
});
