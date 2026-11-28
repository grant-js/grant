/**
 * `Group.users`, `Permission.users` and `Permission.groups` list entities the caller could
 * otherwise only see through the users or groups list. Each goes through that list's own guard:
 * the same `authorizeGraphQLResolver` with the same options, so a caller without `User:Query`
 * gets an authorization error on the field (the web chip says "Not available") while the
 * relationship counts, which name no one, still resolve.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, TokenType } from '@grantjs/schema';
import type { GraphQLResolveInfo } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import { groupResolver } from '@/graphql/resolvers/groups/fields';
import { permissionResolver } from '@/graphql/resolvers/permissions/fields';
import { Query } from '@/graphql/resolvers/queries';
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
    groups: {
      getGroupUserIds: vi.fn(async () => ['u-1', 'u-2']),
      countGroupUsers: vi.fn(async () => 2),
      getGroups: vi.fn(async () => ({ groups: [{ id: 'g-1', name: 'Editors' }] })),
    },
    permissions: {
      getPermissionUserIds: vi.fn(async () => ['u-1']),
      getPermissionGroupIds: vi.fn(async () => ['g-1']),
      countPermissionUsers: vi.fn(async () => 1),
      countPermissionGroups: vi.fn(async () => 1),
    },
    users: {
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

describe('relationship list fields', () => {
  it.each([
    ['Group.users', groupResolver.users],
    ['Permission.users', permissionResolver.users],
    ['Permission.groups', permissionResolver.groups],
  ])('%s is behind the authorization guard', (_name, resolver) => {
    expect(isAuthorizedGraphQLResolver(resolver)).toBe(true);
  });

  it('checks User:Query, the permission the users list checks, for Group.users and Permission.users', async () => {
    const { context, isAuthorized } = setup(true);
    await call(Query.users, {}, context, { scope });
    const usersListCheck = isAuthorized.mock.calls.at(-1)?.[0];

    for (const [resolver, parent] of [
      [groupResolver.users, { id: 'g-1' }],
      [permissionResolver.users, { id: 'p-1' }],
    ] as const) {
      isAuthorized.mockClear();
      await call(resolver, parent, context);
      expect(isAuthorized).toHaveBeenCalledTimes(1);
      expect(isAuthorized.mock.calls[0]?.[0]).toEqual(usersListCheck);
    }
    expect(usersListCheck).toMatchObject({
      permission: { resource: ResourceSlug.User, action: ResourceAction.Query },
    });
  });

  it('checks Group:Query for Permission.groups', async () => {
    const { context, isAuthorized } = setup(true);
    await call(permissionResolver.groups, { id: 'p-1' }, context);
    expect(isAuthorized.mock.calls[0]?.[0]).toMatchObject({
      permission: { resource: ResourceSlug.Group, action: ResourceAction.Query },
    });
  });

  it('lists a group’s members through the users list, in the caller’s scope, sorted by name', async () => {
    const { context, handlers } = setup(true);
    const users = await call(groupResolver.users, { id: 'g-1' }, context, { limit: 10 });

    expect(handlers.groups.getGroupUserIds).toHaveBeenCalledWith({ groupId: 'g-1', scope });
    expect(handlers.users.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        ids: ['u-1', 'u-2'],
        limit: 10,
        sort: { field: 'name', order: 'ASC' },
      })
    );
    expect(users).toEqual([
      { id: 'u-1', name: 'Ada' },
      { id: 'u-2', name: 'Grace' },
    ]);
  });

  it('does not call the users list with no ids, which would list every user', async () => {
    const { context, handlers } = setup(true);
    handlers.permissions.getPermissionUserIds.mockResolvedValueOnce([]);
    await expect(call(permissionResolver.users, { id: 'p-1' }, context)).resolves.toEqual([]);
    expect(handlers.users.getUsers).not.toHaveBeenCalled();
  });

  describe('a viewer without User:Query', () => {
    it('gets an authorization error for the members and lists nothing', async () => {
      const { context, handlers } = setup(false);

      for (const [resolver, parent] of [
        [groupResolver.users, { id: 'g-1' }],
        [permissionResolver.users, { id: 'p-1' }],
      ] as const) {
        expect(await refusal(call(resolver, parent, context))).toBeInstanceOf(AuthorizationError);
      }
      expect(handlers.groups.getGroupUserIds).not.toHaveBeenCalled();
      expect(handlers.permissions.getPermissionUserIds).not.toHaveBeenCalled();
      expect(handlers.users.getUsers).not.toHaveBeenCalled();
    });

    it('still sees the counts', async () => {
      const { context } = setup(false);
      await expect(call(groupResolver.userCount, { id: 'g-1' }, context)).resolves.toBe(2);
      await expect(call(permissionResolver.userCount, { id: 'p-1' }, context)).resolves.toBe(1);
      await expect(call(permissionResolver.groupCount, { id: 'p-1' }, context)).resolves.toBe(1);
    });
  });

  it('uses a count a list already hydrated instead of counting again', async () => {
    const { context, handlers } = setup(true);
    await expect(call(groupResolver.userCount, { id: 'g-1', userCount: 7 }, context)).resolves.toBe(
      7
    );
    expect(handlers.groups.countGroupUsers).not.toHaveBeenCalled();
  });
});
