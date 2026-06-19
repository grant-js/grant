import { type Scope, type Tag, Tenant, type User } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';

const scope: Scope = {
  tenant: Tenant.OrganizationProject,
  id: 'org-1:project-1',
};

const tag: Tag = {
  id: 'tag-1',
  name: 'Lisbon',
  color: '#123456',
  metadata: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
};

const users: User[] = [
  {
    id: 'user-1',
    name: 'User One',
    metadata: {},
    permissionCount: 0,
    projectUserApiKeyCount: 0,
    roleCount: 0,
    tagCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  },
  {
    id: 'user-2',
    name: 'User Two',
    metadata: {},
    permissionCount: 0,
    projectUserApiKeyCount: 0,
    roleCount: 0,
    tagCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  },
];

function createHandler() {
  const userTags = {
    getUserTagIntersection: vi.fn(),
    getUserTagsByUserIds: vi.fn().mockResolvedValue([
      { userId: 'user-1', tagId: 'tag-1', isPrimary: true },
      { userId: 'user-2', tagId: 'tag-out-of-scope', isPrimary: true },
    ]),
  };
  const userRoles = {
    getUserRolesByUserIds: vi.fn().mockResolvedValue([
      { userId: 'user-1', roleId: 'role-1' },
      { userId: 'user-1', roleId: 'role-out-of-scope' },
      { userId: 'user-2', roleId: 'role-out-of-scope' },
    ]),
  };
  const usersService = {
    getUsers: vi.fn().mockResolvedValue({
      users: users.map((user) => ({ ...user })),
      totalCount: 2,
      hasNextPage: false,
    }),
  };
  const projectUsers = {
    getProjectUsers: vi.fn().mockResolvedValue([]),
  };
  const scopeServices = {
    tags: {
      getTags: vi.fn().mockResolvedValue({
        tags: [tag],
        totalCount: 1,
        hasNextPage: false,
      }),
    },
    projectUserApiKeys: {
      countProjectUserApiKeysByUserIds: vi.fn().mockResolvedValue(new Map([['user-1', 2]])),
    },
  };
  const handler = new UserHandler(
    userTags as never,
    usersService as never,
    {} as never,
    projectUsers as never,
    userRoles as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    scopeServices as never,
    {} as never
  );

  Object.assign(handler as unknown as Record<string, unknown>, {
    getScopedUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2']),
    getScopedTagIds: vi.fn().mockResolvedValue(['tag-1']),
    getScopedRoleIds: vi.fn().mockResolvedValue(['role-1']),
  });

  return { handler, projectUsers, scopeServices, userRoles, userTags, usersService };
}

describe('UserHandler list hydration', () => {
  it('hydrates scoped tags and counts with grouped calls for the page', async () => {
    const { handler, scopeServices, userRoles, userTags, usersService } = createHandler();

    const result = await handler.getUsers({
      scope,
      requestedFields: [
        'id',
        'name',
        'tags',
        'primaryTag',
        'tagCount',
        'roleCount',
        'projectUserApiKeyCount',
      ],
    });

    expect(usersService.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        ids: ['user-1', 'user-2'],
        requestedFields: ['id', 'name'],
      })
    );
    expect(userTags.getUserTagsByUserIds).toHaveBeenCalledTimes(1);
    expect(userTags.getUserTagsByUserIds).toHaveBeenCalledWith(['user-1', 'user-2']);
    expect(scopeServices.tags.getTags).toHaveBeenCalledTimes(1);
    expect(scopeServices.tags.getTags).toHaveBeenCalledWith({ ids: ['tag-1'], limit: -1 });
    expect(userRoles.getUserRolesByUserIds).toHaveBeenCalledTimes(1);
    expect(scopeServices.projectUserApiKeys.countProjectUserApiKeysByUserIds).toHaveBeenCalledWith({
      projectId: 'project-1',
      userIds: ['user-1', 'user-2'],
    });

    expect(result.users).toEqual([
      expect.objectContaining({
        id: 'user-1',
        tags: [{ ...tag, isPrimary: true }],
        primaryTag: { ...tag, isPrimary: true },
        tagCount: 1,
        roleCount: 1,
        projectUserApiKeyCount: 2,
      }),
      expect.objectContaining({
        id: 'user-2',
        tags: [],
        primaryTag: null,
        tagCount: 0,
        roleCount: 0,
        projectUserApiKeyCount: 0,
      }),
    ]);
  });
});
