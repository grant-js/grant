import { type Scope, Tenant, type User } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';

const scope: Scope = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:project-1',
};

function user(id: string): User {
  return {
    id,
    name: id,
    metadata: {},
    permissionCount: 0,
    projectUserApiKeyCount: 0,
    roleCount: 0,
    tagCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };
}

function createHandler(pageUsers: User[]) {
  const usersService = {
    getUsers: vi.fn().mockResolvedValue({
      users: pageUsers.map((item) => ({ ...item })),
      totalCount: 500,
      hasNextPage: true,
    }),
  };
  const projectUsers = {
    getProjectUsers: vi.fn().mockResolvedValue([]),
    filterUserIdsBySearchDocument: vi.fn(),
  };
  const handler = new UserHandler(
    {
      getUserTagIntersection: vi.fn(),
      getUserTagsByUserIds: vi.fn().mockResolvedValue([]),
    } as never,
    usersService as never,
    {} as never,
    projectUsers as never,
    { getUserRolesByUserIds: vi.fn().mockResolvedValue([]) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      tags: { getTags: vi.fn().mockResolvedValue({ tags: [], totalCount: 0, hasNextPage: false }) },
      projectUserApiKeys: {
        countProjectUserApiKeysByUserIds: vi.fn().mockResolvedValue(new Map()),
      },
    } as never,
    {} as never,
    {} as never
  );

  Object.assign(handler as unknown as Record<string, unknown>, {
    getScopedUserIds: vi
      .fn()
      .mockResolvedValue(Array.from({ length: 500 }, (_, index) => `tenant-user-${index}`)),
    getScopedTagIds: vi.fn().mockResolvedValue([]),
    getScopedRoleIds: vi.fn().mockResolvedValue([]),
  });

  return { handler, projectUsers, usersService };
}

describe('UserHandler project-user pivot page', () => {
  it('loads project_users only for the page user ids, not the whole tenant', async () => {
    const pageUsers = [user('page-1'), user('page-2')];
    const { handler, projectUsers, usersService } = createHandler(pageUsers);

    await handler.getUsers({
      scope,
      page: 1,
      limit: 2,
      requestedFields: ['id', 'name', 'metadata', 'pictureUrl'],
    });

    expect(usersService.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        page: 1,
        limit: 2,
      })
    );
    expect(usersService.getUsers.mock.calls[0][0].ids).toBeUndefined();
    expect(
      (handler as unknown as { getScopedUserIds: ReturnType<typeof vi.fn> }).getScopedUserIds
    ).not.toHaveBeenCalled();
    expect(projectUsers.getProjectUsers).toHaveBeenCalledTimes(1);
    expect(projectUsers.getProjectUsers).toHaveBeenCalledWith({
      projectId: 'project-1',
      userIds: ['page-1', 'page-2'],
    });
    expect(projectUsers.getProjectUsers.mock.calls[0][0]).not.toEqual({ projectId: 'project-1' });
  });

  it('skips the project_users load when the page is empty', async () => {
    const { handler, projectUsers } = createHandler([]);

    const result = await handler.getUsers({
      scope,
      requestedFields: ['id', 'name', 'metadata'],
    });

    expect(result.users).toEqual([]);
    expect(projectUsers.getProjectUsers).not.toHaveBeenCalled();
  });
});
