import { type Scope, SortOrder, Tenant, UserSortableField } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';

const scope: Scope = {
  tenant: Tenant.Organization,
  id: 'org-1',
};

function createHandler() {
  const usersService = {
    getUsers: vi.fn().mockResolvedValue({
      users: [],
      totalCount: 0,
      hasNextPage: false,
    }),
  };
  const userTags = {
    getUserTagIntersection: vi.fn(),
    getUserTagsByUserIds: vi.fn().mockResolvedValue([]),
  };
  const projectUsers = {
    getProjectUsers: vi.fn().mockResolvedValue([]),
    filterUserIdsBySearchDocument: vi.fn(),
  };
  const handler = new UserHandler(
    userTags as never,
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
      .mockResolvedValue(Array.from({ length: 1000 }, (_, index) => `tenant-user-${index}`)),
  });

  return { handler, usersService, userTags, projectUsers };
}

describe('UserHandler scoped list paging', () => {
  it('forwards search, tagIds, explicit ids, sort, and page without materializing scoped ids', async () => {
    const { handler, usersService, userTags, projectUsers } = createHandler();
    const scoped = handler as unknown as { getScopedUserIds: ReturnType<typeof vi.fn> };

    await handler.getUsers({
      scope,
      page: 2,
      limit: 50,
      search: 'ada',
      sort: { field: UserSortableField.Name, order: SortOrder.Asc },
      ids: ['outside-page-1', 'also-out-of-scope'],
      tagIds: ['tag-1'],
      requestedFields: ['id', 'name'],
    });

    expect(scoped.getScopedUserIds).not.toHaveBeenCalled();
    expect(userTags.getUserTagIntersection).not.toHaveBeenCalled();
    expect(projectUsers.filterUserIdsBySearchDocument).not.toHaveBeenCalled();
    expect(usersService.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        page: 2,
        limit: 50,
        search: 'ada',
        ids: ['outside-page-1', 'also-out-of-scope'],
        tagIds: ['tag-1'],
      })
    );
    expect(usersService.getUsers.mock.calls[0][0].ids).toHaveLength(2);
  });
});
