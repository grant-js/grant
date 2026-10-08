import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { LAST_HUMAN_USER_REASON } from '@/lib/signup-policy.lib';
import { UserService } from '@/services/users.service';

const { SYSTEM_USER_ID } = vi.hoisted(() => ({
  SYSTEM_USER_ID: '00000000-0000-0000-0000-000000000001',
}));
const HUMAN_ID = '30000000-0000-4000-8000-000000000001';
const now = new Date('2026-10-07T12:00:00.000Z');

vi.mock('@/config', () => ({
  config: { system: { systemUserId: SYSTEM_USER_ID } },
}));

function user(id: string) {
  return {
    id,
    name: 'Ada',
    metadata: {},
    pictureUrl: null,
    picturePath: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

describe('UserService.deleteUser last human', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const userRepository = {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
    countHumanUsers: vi.fn(),
    softDeleteUser: vi.fn(),
    hardDeleteUser: vi.fn(),
  };
  const fileStorage = { getUrl: vi.fn() };

  function svc() {
    return new UserService(
      userRepository as never,
      { userId: HUMAN_ID } as never,
      audit as never,
      fileStorage as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.getUsers.mockResolvedValue({
      users: [user(HUMAN_ID)],
      totalCount: 1,
      hasNextPage: false,
    });
    userRepository.softDeleteUser.mockResolvedValue(user(HUMAN_ID));
  });

  it('refuses deleting the last human user', async () => {
    userRepository.countHumanUsers.mockResolvedValue(1);

    await expect(svc().deleteUser({ id: HUMAN_ID })).rejects.toMatchObject({
      reason: LAST_HUMAN_USER_REASON,
    });
    expect(userRepository.softDeleteUser).not.toHaveBeenCalled();
    expect(userRepository.countHumanUsers).toHaveBeenCalledWith(SYSTEM_USER_ID, undefined);
  });

  it('deletes a human when another human remains', async () => {
    userRepository.countHumanUsers.mockResolvedValue(2);

    await svc().deleteUser({ id: HUMAN_ID });

    expect(userRepository.softDeleteUser).toHaveBeenCalled();
  });

  it('does not block deleting the system user via last-human policy', async () => {
    userRepository.getUsers.mockResolvedValue({
      users: [user(SYSTEM_USER_ID)],
      totalCount: 1,
      hasNextPage: false,
    });
    userRepository.countHumanUsers.mockResolvedValue(1);
    userRepository.softDeleteUser.mockResolvedValue(user(SYSTEM_USER_ID));

    await svc().deleteUser({ id: SYSTEM_USER_ID });

    expect(userRepository.softDeleteUser).toHaveBeenCalled();
  });

  it('throws AuthorizationError with LAST_HUMAN_USER', async () => {
    userRepository.countHumanUsers.mockResolvedValue(1);

    await expect(svc().deleteUser({ id: HUMAN_ID })).rejects.toBeInstanceOf(AuthorizationError);
  });
});
