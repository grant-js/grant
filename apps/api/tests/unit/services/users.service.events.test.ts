import { describe, expect, it, vi } from 'vitest';

import { UserService } from '@/services/users.service';

const USER_ID = '10000000-0000-4000-8000-0000000000a1';
const PROJECT_A = '10000000-0000-4000-8000-0000000000b1';
const PROJECT_B = '10000000-0000-4000-8000-0000000000b2';
const tx = { __tx: true };

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'Jane Example',
    pictureUrl: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function build(
  linkedProjectIds: string[] = [PROJECT_A, PROJECT_B],
  memberships: Array<{ projectId: string; metadata: unknown }> = [],
  userMetadata: Record<string, unknown> = {}
) {
  const order: string[] = [];
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({
      users: [user({ metadata: userMetadata })],
      totalCount: 1,
      hasNextPage: false,
    }),
    getUserMembershipMetadata: vi.fn().mockImplementation(async () => {
      order.push('memberships');
      return memberships;
    }),
    createUser: vi.fn().mockResolvedValue(user()),
    updateUser: vi.fn().mockImplementation(async (_id, input) => user(input)),
    countHumanUsers: vi.fn().mockResolvedValue(2),
    softDeleteUser: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return user({ deletedAt: new Date('2026-02-01T00:00:00.000Z') });
    }),
    hardDeleteUser: vi.fn().mockImplementation(async () => {
      order.push('delete');
      return user();
    }),
  };
  const events = {
    publish: vi.fn().mockImplementation(async () => {
      order.push('publish');
    }),
    resolveLinkedProjectIds: vi.fn().mockImplementation(async () => {
      order.push('resolve');
      return linkedProjectIds;
    }),
  };
  const service = new UserService(
    userRepository as never,
    { userId: USER_ID } as never,
    {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
    } as never,
    { getUrl: vi.fn() } as never,
    { removeAllForUser: vi.fn() } as never,
    events as never
  );
  return { service, userRepository, events, order };
}

describe('UserService lifecycle events', () => {
  it('publishes user.created with ids and timestamps only, naming no project at creation', async () => {
    const { service, events } = build([]);

    await service.createUser({ name: 'Jane Example' }, tx as never);

    expect(events.publish).toHaveBeenCalledWith(
      {
        type: 'user.created',
        subjectUserId: USER_ID,
        aggregate: { kind: 'user', id: USER_ID },
        data: { after: { id: USER_ID, createdAt: expect.any(Date), updatedAt: expect.any(Date) } },
        projectIds: [],
      },
      tx
    );
  });

  it('publishes user.updated with the names of the changed fields, never their values', async () => {
    const { service, events } = build();

    await service.updateUser(USER_ID, { name: 'Jane Renamed' }, tx as never);

    expect(events.publish).toHaveBeenCalledTimes(1);
    const event = events.publish.mock.calls[0][0];
    expect(event).toMatchObject({
      type: 'user.updated',
      subjectUserId: USER_ID,
      aggregate: { kind: 'user', id: USER_ID },
      data: { after: { id: USER_ID, changedFields: ['name'] } },
    });
    expect(JSON.stringify(event)).not.toContain('Jane');
  });

  it('publishes user.updated naming every project the user is a member of', async () => {
    const { service, events } = build();

    await service.updateUser(USER_ID, { name: 'Jane Renamed' }, tx as never);

    expect(events.resolveLinkedProjectIds).toHaveBeenCalledWith(
      [{ kind: 'user', id: USER_ID }],
      tx
    );
    expect(events.publish.mock.calls[0][0].projectIds).toEqual([PROJECT_A, PROJECT_B]);
  });

  it('publishes nothing for an update that changed nothing', async () => {
    const { service, events } = build();

    await service.updateUser(USER_ID, { name: 'Jane Example' }, tx as never);

    expect(events.publish).not.toHaveBeenCalled();
    expect(events.resolveLinkedProjectIds).not.toHaveBeenCalled();
  });

  it('publishes user.deleted for a soft delete with the projects read before the delete', async () => {
    const { service, events, order } = build();

    await service.deleteUser({ id: USER_ID }, tx as never);

    expect(events.resolveLinkedProjectIds).toHaveBeenCalledWith(
      [{ kind: 'user', id: USER_ID }],
      tx
    );
    expect(events.publish).toHaveBeenCalledWith(
      {
        type: 'user.deleted',
        subjectUserId: USER_ID,
        aggregate: { kind: 'user', id: USER_ID },
        data: {
          before: {
            id: USER_ID,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            externalKeys: [],
          },
          after: { id: USER_ID, hardDelete: false },
        },
        projectIds: [PROJECT_A, PROJECT_B],
      },
      tx
    );
    expect(order).toEqual(['resolve', 'memberships', 'publish', 'delete']);
  });

  it('publishes user.deleted BEFORE a hard delete: the event row references the user it would otherwise lose', async () => {
    const { service, events, order } = build();

    await service.deleteUser({ id: USER_ID, hardDelete: true }, tx as never);

    expect(order).toEqual(['resolve', 'memberships', 'publish', 'delete']);
    expect(events.publish.mock.calls[0][0]).toMatchObject({
      type: 'user.deleted',
      data: { after: { id: USER_ID, hardDelete: true } },
    });
  });

  it('keeps the name out of the outbox row, which outlives a hard delete', async () => {
    const { service, events } = build();

    await service.deleteUser({ id: USER_ID, hardDelete: true }, tx as never);

    expect(JSON.stringify(events.publish.mock.calls[0][0])).not.toContain('Jane');
  });

  it('self-deletion goes through the same event', async () => {
    const { service, events } = build();

    await service.deleteOwnUser({ hardDelete: false }, tx as never);

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user.deleted', subjectUserId: USER_ID }),
      tx
    );
  });

  describe('externalKeys on user.deleted', () => {
    const marker = (projectId: string, externalKey: string) => ({
      cdmImport: { projectId, kind: 'user', externalKey },
    });

    it('stores the keys of every project, read before the event is published and the user deleted', async () => {
      const { service, events, order, userRepository } = build(
        [PROJECT_A, PROJECT_B],
        [
          { projectId: PROJECT_A, metadata: marker(PROJECT_A, 'key-a') },
          { projectId: PROJECT_B, metadata: { cdmSource: { legacy: { id: 'legacy-b' } } } },
        ],
        {}
      );

      await service.deleteUser({ id: USER_ID }, tx as never);

      expect(userRepository.getUserMembershipMetadata).toHaveBeenCalledWith(USER_ID, tx);
      expect(order).toEqual(['resolve', 'memberships', 'publish', 'delete']);
      expect(events.publish.mock.calls[0][0].data.before.externalKeys).toEqual([
        { projectId: PROJECT_A, externalKey: 'key-a' },
        { projectId: PROJECT_B, externalKey: 'legacy-b' },
      ]);
    });

    it("reads the global user's marker for a project whose row carries none", async () => {
      const { service, events } = build(
        [PROJECT_A],
        [{ projectId: PROJECT_A, metadata: {} }],
        marker(PROJECT_A, 'global-key')
      );

      await service.deleteUser({ id: USER_ID }, tx as never);

      expect(events.publish.mock.calls[0][0].data.before.externalKeys).toEqual([
        { projectId: PROJECT_A, externalKey: 'global-key' },
      ]);
    });

    it('keeps the keys on a hard delete, and never an address or the name', async () => {
      const { service, events } = build(
        [PROJECT_A],
        [
          {
            projectId: PROJECT_A,
            metadata: {
              ...marker(PROJECT_A, 'someone@example.test'),
              cdmSource: { legacy: { id: 'legacy-a', email: 'someone@example.test' } },
            },
          },
        ]
      );

      await service.deleteUser({ id: USER_ID, hardDelete: true }, tx as never);

      const event = events.publish.mock.calls[0][0];
      expect(event.data.before.externalKeys).toEqual([
        { projectId: PROJECT_A, externalKey: 'legacy-a' },
      ]);
      expect(JSON.stringify(event)).not.toContain('example.test');
      expect(JSON.stringify(event)).not.toContain('Jane');
    });
  });
});
