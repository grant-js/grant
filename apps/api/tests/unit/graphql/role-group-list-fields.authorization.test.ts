/**
 * `Role.users` and `Group.roles` list entities the caller could otherwise only see through the
 * users or roles list. Each goes through that list's own guard: the same
 * `authorizeGraphQLResolver` with the same options, so a caller without `User:Query` or
 * `Role:Query` gets an authorization error on the field (the web chip says "Not available")
 * while the relationship counts, which name no one, still resolve.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, TokenType } from '@grantjs/schema';
import type { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { groupResolver } from '@/graphql/resolvers/groups/fields';
import { Query } from '@/graphql/resolvers/queries';
import { roleResolver } from '@/graphql/resolvers/roles/fields';
import { userResolver } from '@/graphql/resolvers/users/fields';
import type { GraphqlContext } from '@/graphql/types';
import { isAuthorizedGraphQLResolver } from '@/lib/authorization/graphql-guard';
import { AuthorizationError } from '@/lib/errors/error-classes';

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
const info = { fieldNodes: [] } as unknown as GraphQLResolveInfo;

type FieldResolver = (
  parent: unknown,
  args: unknown,
  context: GraphqlContext,
  info: GraphQLResolveInfo
) => Promise<unknown>;

function setup(authorized: boolean) {
  const isAuthorized = vi.fn(async (_input: unknown) => ({
    authorized,
    reason: authorized ? null : 'no permission',
  }));
  const handlers = {
    auth: { isAuthorized },
    roles: {
      getRoleUserIds: vi.fn(async () => ['u-1', 'u-2']),
      countRoleUsers: vi.fn(async () => 2),
      getRoles: vi.fn(async () => ({ roles: [{ id: 'r-1', name: 'Editor' }] })),
    },
    groups: {
      getGroupRoleIds: vi.fn(async () => ['r-1']),
      countGroupRoles: vi.fn(async () => 1),
    },
    users: {
      countUserGroups: vi.fn(async () => 3),
      getUsers: vi.fn(async () => ({
        users: [
          { id: 'u-1', name: 'Ada' },
          { id: 'u-2', name: 'Grace' },
        ],
      })),
    },
  };
  const context = {
    user: { type: TokenType.Session, userId: 'viewer', isVerified: true, scope },
    handlers,
    resourceResolvers: {},
  } as unknown as GraphqlContext;
  return { context, handlers, isAuthorized };
}

const call = (resolver: unknown, parent: object, context: GraphqlContext, args = {}) =>
  (resolver as FieldResolver)(parent, args, context, info);

async function refusal(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error
  );
}

describe('role and group relationship list fields', () => {
  it.each([
    ['Role.users', roleResolver.users],
    ['Group.roles', groupResolver.roles],
  ])('%s is behind the authorization guard', (_name, resolver) => {
    expect(isAuthorizedGraphQLResolver(resolver)).toBe(true);
  });

  it('checks User:Query, the permission the users list checks, for Role.users', async () => {
    const { context, isAuthorized } = setup(true);
    await call(Query.users, {}, context, { scope });
    const usersListCheck = isAuthorized.mock.calls.at(-1)?.[0];

    isAuthorized.mockClear();
    await call(roleResolver.users, { id: 'r-1' }, context);
    expect(isAuthorized).toHaveBeenCalledTimes(1);
    expect(isAuthorized.mock.calls[0]?.[0]).toEqual(usersListCheck);
    expect(usersListCheck).toMatchObject({
      permission: { resource: ResourceSlug.User, action: ResourceAction.Query },
    });
  });

  it('checks Role:Query, the permission the roles list checks, for Group.roles', async () => {
    const { context, isAuthorized } = setup(true);
    await call(Query.roles, {}, context, { scope });
    const rolesListCheck = isAuthorized.mock.calls.at(-1)?.[0];

    isAuthorized.mockClear();
    await call(groupResolver.roles, { id: 'g-1' }, context);
    expect(isAuthorized).toHaveBeenCalledTimes(1);
    expect(isAuthorized.mock.calls[0]?.[0]).toEqual(rolesListCheck);
    expect(rolesListCheck).toMatchObject({
      permission: { resource: ResourceSlug.Role, action: ResourceAction.Query },
    });
  });

  it('lists a role’s users through the users list, in the caller’s scope, sorted by name', async () => {
    const { context, handlers } = setup(true);
    const users = await call(roleResolver.users, { id: 'r-1' }, context, { page: 2, limit: 10 });

    expect(handlers.roles.getRoleUserIds).toHaveBeenCalledWith({ roleId: 'r-1', scope });
    expect(handlers.users.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        ids: ['u-1', 'u-2'],
        page: 2,
        limit: 10,
        sort: { field: 'name', order: 'ASC' },
      })
    );
    expect(users).toEqual([
      { id: 'u-1', name: 'Ada' },
      { id: 'u-2', name: 'Grace' },
    ]);
  });

  it('lists a group’s roles through the roles list, in the caller’s scope, sorted by name', async () => {
    const { context, handlers } = setup(true);
    const roles = await call(groupResolver.roles, { id: 'g-1' }, context, { limit: 10 });

    expect(handlers.groups.getGroupRoleIds).toHaveBeenCalledWith({ groupId: 'g-1' });
    expect(handlers.roles.getRoles).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        ids: ['r-1'],
        limit: 10,
        sort: { field: 'name', order: 'ASC' },
      })
    );
    expect(roles).toEqual([{ id: 'r-1', name: 'Editor' }]);
  });

  it('does not call the users list with no ids, which would list every user', async () => {
    const { context, handlers } = setup(true);
    handlers.roles.getRoleUserIds.mockResolvedValueOnce([]);
    await expect(call(roleResolver.users, { id: 'r-1' }, context)).resolves.toEqual([]);
    expect(handlers.users.getUsers).not.toHaveBeenCalled();
  });

  it('does not call the roles list with no ids, which would list every role', async () => {
    const { context, handlers } = setup(true);
    handlers.groups.getGroupRoleIds.mockResolvedValueOnce([]);
    await expect(call(groupResolver.roles, { id: 'g-1' }, context)).resolves.toEqual([]);
    expect(handlers.roles.getRoles).not.toHaveBeenCalled();
  });

  describe('a viewer without the list’s permission', () => {
    it('gets an authorization error for Role.users and lists nothing', async () => {
      const { context, handlers } = setup(false);
      expect(await refusal(call(roleResolver.users, { id: 'r-1' }, context))).toBeInstanceOf(
        AuthorizationError
      );
      expect(handlers.roles.getRoleUserIds).not.toHaveBeenCalled();
      expect(handlers.users.getUsers).not.toHaveBeenCalled();
    });

    it('gets an authorization error for Group.roles and lists nothing', async () => {
      const { context, handlers } = setup(false);
      expect(await refusal(call(groupResolver.roles, { id: 'g-1' }, context))).toBeInstanceOf(
        AuthorizationError
      );
      expect(handlers.groups.getGroupRoleIds).not.toHaveBeenCalled();
      expect(handlers.roles.getRoles).not.toHaveBeenCalled();
    });

    it('still sees the counts', async () => {
      const { context } = setup(false);
      await expect(call(roleResolver.userCount, { id: 'r-1' }, context)).resolves.toBe(2);
      await expect(call(groupResolver.roleCount, { id: 'g-1' }, context)).resolves.toBe(1);
      await expect(call(userResolver.groupCount, { id: 'u-1' }, context)).resolves.toBe(3);
    });
  });

  it('uses a count a list already hydrated instead of counting again', async () => {
    const { context, handlers } = setup(true);
    await expect(call(roleResolver.userCount, { id: 'r-1', userCount: 7 }, context)).resolves.toBe(
      7
    );
    await expect(call(groupResolver.roleCount, { id: 'g-1', roleCount: 6 }, context)).resolves.toBe(
      6
    );
    await expect(
      call(userResolver.groupCount, { id: 'u-1', groupCount: 5 }, context)
    ).resolves.toBe(5);
    expect(handlers.roles.countRoleUsers).not.toHaveBeenCalled();
    expect(handlers.groups.countGroupRoles).not.toHaveBeenCalled();
    expect(handlers.users.countUserGroups).not.toHaveBeenCalled();
  });
});
