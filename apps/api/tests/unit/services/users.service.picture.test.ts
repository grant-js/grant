import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserService } from '@/services/users.service';

const userId = '30000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-13T12:00:00.000Z');
const longDerivedUrl = `https://s3.example/${'x'.repeat(1200)}`;

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: userId,
    name: 'Ada',
    metadata: {},
    pictureUrl: null,
    picturePath: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe('UserService picturePath', () => {
  const audit = {
    logUpdate: vi.fn(),
    logCreate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };
  const userRepository = {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
  };
  const fileStorage = {
    getUrl: vi.fn(async (path: string) => `https://signed.example/${path}`),
  };

  function svc() {
    return new UserService(
      userRepository as never,
      { userId } as never,
      audit as never,
      fileStorage as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.getUsers.mockResolvedValue({
      users: [user()],
      totalCount: 1,
      hasNextPage: false,
    });
    userRepository.updateUser.mockImplementation(async (_id, input) => user(input));
  });

  it('clears picturePath when a client sets pictureUrl', async () => {
    await svc().updateUser(userId, { pictureUrl: 'https://idp.example/avatar.png' });

    expect(userRepository.updateUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        pictureUrl: 'https://idp.example/avatar.png',
        picturePath: null,
      }),
      undefined
    );
  });

  it('does not leave a stale path after updateUser({ pictureUrl })', async () => {
    userRepository.updateUser.mockResolvedValue(
      user({ pictureUrl: 'https://idp.example/avatar.png', picturePath: null })
    );

    const updated = await svc().updateUser(userId, { pictureUrl: 'https://idp.example/avatar.png' });

    expect(userRepository.updateUser.mock.calls[0][1].picturePath).toBeNull();
    expect(updated.pictureUrl).toBe('https://idp.example/avatar.png');
    expect(fileStorage.getUrl).not.toHaveBeenCalled();
  });

  it('derives pictureUrl from picturePath on read', async () => {
    userRepository.getUsers.mockResolvedValue({
      users: [user({ picturePath: 'users/1/picture.jpg', pictureUrl: null })],
      totalCount: 1,
      hasNextPage: false,
    });

    const page = await svc().getUsers({ limit: 1 });

    expect(page.users[0].pictureUrl).toBe('https://signed.example/users/1/picture.jpg');
    expect(fileStorage.getUrl).toHaveBeenCalledWith('users/1/picture.jpg');
  });

  it('falls back to the IdP pictureUrl when picturePath is null', async () => {
    userRepository.getUsers.mockResolvedValue({
      users: [user({ picturePath: null, pictureUrl: 'https://idp.example/avatar.png' })],
      totalCount: 1,
      hasNextPage: false,
    });

    const page = await svc().getUsers({ limit: 1 });

    expect(page.users[0].pictureUrl).toBe('https://idp.example/avatar.png');
    expect(fileStorage.getUrl).not.toHaveBeenCalled();
  });

  it('returns a derived URL longer than the stored column', async () => {
    expect(longDerivedUrl.length).toBeGreaterThan(500);
    fileStorage.getUrl.mockResolvedValue(longDerivedUrl);
    userRepository.getUsers.mockResolvedValue({
      users: [user({ picturePath: 'users/1/picture.jpg', pictureUrl: null })],
      totalCount: 1,
      hasNextPage: false,
    });

    const page = await svc().getUsers({ limit: 1 });

    expect(page.users[0].pictureUrl).toBe(longDerivedUrl);
    expect(page.users[0].pictureUrl?.length).toBeGreaterThan(500);
  });
});
