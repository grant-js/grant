import { describe, expect, it, vi } from 'vitest';

import { UserService } from '@/services/users.service';

const USER_ID = '10000000-0000-4000-8000-0000000000e1';
const tx = { transaction: true };

function user() {
  return {
    id: USER_ID,
    name: 'Erased User',
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

function build() {
  const userRepository = {
    getUsers: vi.fn().mockResolvedValue({ users: [user()], totalCount: 1, hasNextPage: false }),
    countHumanUsers: vi.fn().mockResolvedValue(2),
    getUserMembershipMetadata: vi.fn().mockResolvedValue([]),
    softDeleteUser: vi.fn().mockResolvedValue({ ...user(), deletedAt: new Date() }),
    hardDeleteUser: vi.fn().mockResolvedValue(user()),
  };
  const events = { publish: vi.fn(), resolveLinkedProjectIds: vi.fn().mockResolvedValue([]) };
  const credentials = { removeAllForUser: vi.fn().mockResolvedValue(2) };
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
    credentials as never,
    events as never
  );
  return { service, userRepository, credentials };
}

describe('UserService.deleteUser credential erasure', () => {
  it('soft-deletes every credential of a soft-deleted user, in the same transaction', async () => {
    const { service, userRepository, credentials } = build();

    await service.deleteUser({ id: USER_ID }, tx as never);

    expect(userRepository.softDeleteUser).toHaveBeenCalled();
    expect(credentials.removeAllForUser).toHaveBeenCalledWith(USER_ID, tx);
  });

  it('leaves a hard delete to the ON DELETE CASCADE of the credential tables', async () => {
    const { service, userRepository, credentials } = build();

    await service.deleteUser({ id: USER_ID, hardDelete: true }, tx as never);

    expect(userRepository.hardDeleteUser).toHaveBeenCalled();
    expect(credentials.removeAllForUser).not.toHaveBeenCalled();
  });

  it('removes credentials when a user deletes their own account', async () => {
    const { service, credentials } = build();

    await service.deleteOwnUser({}, tx as never);

    expect(credentials.removeAllForUser).toHaveBeenCalledWith(USER_ID, tx);
  });

  it('does not touch credentials when the deletion is refused', async () => {
    const { service, userRepository, credentials } = build();
    userRepository.countHumanUsers.mockResolvedValue(1);

    await expect(service.deleteUser({ id: USER_ID }, tx as never)).rejects.toThrow();

    expect(credentials.removeAllForUser).not.toHaveBeenCalled();
  });
});
