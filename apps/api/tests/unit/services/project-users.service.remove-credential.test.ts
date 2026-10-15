import { describe, expect, it, vi } from 'vitest';

import { ProjectUserService } from '@/services/project-users.service';

const projectId = '10000000-0000-4000-8000-000000000060';
const userId = '10000000-0000-4000-8000-000000000061';
const projectUserId = '10000000-0000-4000-8000-000000000062';
const tx = { transaction: true };

function buildService(options: { member?: boolean } = {}) {
  const member = options.member ?? true;
  const order: string[] = [];
  const row = {
    id: projectUserId,
    projectId,
    userId,
    metadata: {},
    displayName: null,
    pictureUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: new Date('2026-02-01T00:00:00.000Z'),
  };

  const projectUserRepository = {
    getProjectUsers: vi.fn().mockResolvedValue(member ? [{ ...row, deletedAt: null }] : []),
    softDeleteProjectUser: vi.fn(async () => {
      order.push('membership-soft-deleted');
      return row;
    }),
    hardDeleteProjectUser: vi.fn(async () => {
      order.push('membership-hard-deleted');
      return row;
    }),
  };
  const credentials = {
    removeCredential: vi.fn(async () => {
      order.push('credential-removed');
      return true;
    }),
  };
  const service = new ProjectUserService(
    { existsById: vi.fn().mockResolvedValue(true) } as never,
    { getUsers: vi.fn().mockResolvedValue({ users: [{ id: userId }] }) } as never,
    projectUserRepository as never,
    { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
    { getFirstByProjectId: vi.fn().mockResolvedValue(null) } as never,
    {
      logCreate: vi.fn(),
      logUpdate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
    } as never,
    { publish: vi.fn() } as never,
    { getUrl: vi.fn() } as never,
    credentials as never
  );
  return { service, credentials, projectUserRepository, order };
}

describe('ProjectUserService.removeProjectUser credential hook', () => {
  it('soft-deletes the project credential of the removed member, in the same transaction', async () => {
    const { service, credentials, order } = buildService();

    await service.removeProjectUser({ projectId, userId }, tx as never);

    expect(credentials.removeCredential).toHaveBeenCalledTimes(1);
    expect(credentials.removeCredential).toHaveBeenCalledWith(
      { scope: 'project', projectId },
      userId,
      tx
    );
    expect(order).toEqual(['membership-soft-deleted', 'credential-removed']);
  });

  it('removes the credential on a hard delete of the membership too', async () => {
    const { service, credentials } = buildService();

    await service.removeProjectUser({ projectId, userId, hardDelete: true }, tx as never);

    expect(credentials.removeCredential).toHaveBeenCalledWith(
      { scope: 'project', projectId },
      userId,
      tx
    );
  });

  it('touches no credential when the user is not a member', async () => {
    const { service, credentials } = buildService({ member: false });

    await expect(service.removeProjectUser({ projectId, userId }, tx as never)).rejects.toThrow();

    expect(credentials.removeCredential).not.toHaveBeenCalled();
  });

  it('lets the removal fail, and so roll back, when the credential cannot be removed', async () => {
    const { service, credentials } = buildService();
    credentials.removeCredential.mockRejectedValueOnce(new Error('storage down'));

    await expect(service.removeProjectUser({ projectId, userId }, tx as never)).rejects.toThrow(
      'storage down'
    );
  });
});
