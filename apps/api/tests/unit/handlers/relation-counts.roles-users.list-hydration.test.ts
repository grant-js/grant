/**
 * The relationship counts the role, group and user lists show (a role's users, a group's roles,
 * a user's groups) are one grouped count per page, in the list's scope, and only when the list
 * asks for them.
 */
import { type Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { GroupHandler } from '@/handlers/groups.handler';
import { RoleHandler } from '@/handlers/roles.handler';
import { UserHandler } from '@/handlers/users.handler';

const scope: Scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };
const organizationScope: Scope = { tenant: Tenant.Organization, id: 'org-1' };

const page = <T extends { id: string }>(key: string, items: T[]) => ({
  [key]: items,
  totalCount: items.length,
  hasNextPage: false,
});

function roleHandler() {
  const roles = {
    getRoles: vi.fn().mockResolvedValue(
      page('roles', [
        { id: 'r-1', name: 'Editor' },
        { id: 'r-2', name: 'Viewer' },
      ])
    ),
  };
  const roleGroups = { countRoleGroupsByRoleIds: vi.fn() };
  const userRoles = {
    countUsersByRoleIds: vi.fn().mockResolvedValue(new Map([['r-1', 3]])),
  };
  const handler = new RoleHandler(
    {} as never,
    roles as never,
    {} as never,
    {} as never,
    roleGroups as never,
    {} as never,
    {} as never,
    {} as never,
    userRoles as never,
    {} as never,
    {} as never,
    {} as never
  );
  return { handler, roles, roleGroups, userRoles };
}

function groupHandler() {
  const groups = {
    getGroups: vi.fn().mockResolvedValue(
      page('groups', [
        { id: 'g-1', name: 'Editors' },
        { id: 'g-2', name: 'Viewers' },
      ])
    ),
  };
  const roleGroups = {
    countRolesByGroupIds: vi.fn().mockResolvedValue(new Map([['g-2', 4]])),
    getRoleGroups: vi.fn().mockResolvedValue([
      { roleId: 'r-1', groupId: 'g-1' },
      { roleId: 'r-1', groupId: 'g-1' },
      { roleId: 'r-2', groupId: 'g-1' },
    ]),
  };
  const handler = new GroupHandler(
    {} as never,
    groups as never,
    {} as never,
    {} as never,
    {} as never,
    roleGroups as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
  return { handler, groups, roleGroups };
}

function userHandler() {
  const usersService = {
    getUsers: vi.fn().mockResolvedValue(
      page('users', [
        { id: 'u-1', name: 'Ada' },
        { id: 'u-2', name: 'Grace' },
      ])
    ),
  };
  const userGroups = {
    countUserGroupsByUserIds: vi.fn().mockResolvedValue(new Map([['u-1', 5]])),
    getUserGroupsByUserIds: vi.fn().mockResolvedValue([
      { userId: 'u-1', groupId: 'g-in-scope' },
      { userId: 'u-1', groupId: 'g-elsewhere' },
      { userId: 'u-2', groupId: 'g-elsewhere' },
    ]),
  };
  const projectUsers = { getProjectUsers: vi.fn().mockResolvedValue([]) };
  const args = Array.from({ length: 23 }, () => ({}) as never);
  args[1] = usersService as never;
  args[3] = projectUsers as never;
  args[5] = userGroups as never;
  const handler = new (UserHandler as unknown as new (...a: never[]) => UserHandler)(...args);
  Object.assign(handler as unknown as Record<string, unknown>, {
    getScopedGroupIds: vi.fn().mockResolvedValue(['g-in-scope']),
  });
  return { handler, usersService, userGroups };
}

describe('Role.userCount in the role list', () => {
  it('is one count for the page, in the list scope, zero for a role nobody holds', async () => {
    const { handler, roles, userRoles } = roleHandler();
    const result = await handler.getRoles({ scope, requestedFields: ['id', 'userCount'] });

    expect(userRoles.countUsersByRoleIds).toHaveBeenCalledTimes(1);
    expect(userRoles.countUsersByRoleIds).toHaveBeenCalledWith(['r-1', 'r-2'], scope);
    expect(result.roles.map((role) => role.userCount)).toEqual([3, 0]);
    expect(roles.getRoles.mock.calls[0]?.[0].requestedFields).not.toContain('userCount');
  });

  it('is not counted when the list does not ask for it', async () => {
    const { handler, userRoles } = roleHandler();
    await handler.getRoles({ scope, requestedFields: ['id', 'name'] });
    expect(userRoles.countUsersByRoleIds).not.toHaveBeenCalled();
  });

  it('counts one role outside a list in the given scope', async () => {
    const { handler, userRoles } = roleHandler();
    await expect(handler.countRoleUsers({ roleId: 'r-1', scope })).resolves.toBe(3);
    expect(userRoles.countUsersByRoleIds).toHaveBeenCalledWith(['r-1'], scope);
  });
});

describe('Group.roleCount in the group list', () => {
  it('is one count for the page, in the list scope, zero for a group in no role', async () => {
    const { handler, groups, roleGroups } = groupHandler();
    const result = await handler.getGroups({ scope, requestedFields: ['id', 'roleCount'] });

    expect(roleGroups.countRolesByGroupIds).toHaveBeenCalledTimes(1);
    expect(roleGroups.countRolesByGroupIds).toHaveBeenCalledWith(['g-1', 'g-2'], scope);
    expect(result.groups.map((group) => group.roleCount)).toEqual([0, 4]);
    expect(groups.getGroups.mock.calls[0]?.[0].requestedFields).not.toContain('roleCount');
  });

  it('is not counted when the list does not ask for it', async () => {
    const { handler, roleGroups } = groupHandler();
    await handler.getGroups({ scope, requestedFields: ['id', 'name'] });
    expect(roleGroups.countRolesByGroupIds).not.toHaveBeenCalled();
  });

  it('lists the ids of the roles including a group once each', async () => {
    const { handler, roleGroups } = groupHandler();
    await expect(handler.getGroupRoleIds({ groupId: 'g-1' })).resolves.toEqual(['r-1', 'r-2']);
    expect(roleGroups.getRoleGroups).toHaveBeenCalledWith({ groupId: 'g-1' });
  });
});

describe('User.groupCount in the user list', () => {
  it('in a project counts the user’s groups of that project, one read for the page', async () => {
    const { handler, usersService, userGroups } = userHandler();
    const result = await handler.getUsers({ scope, requestedFields: ['id', 'groupCount'] });

    expect(userGroups.getUserGroupsByUserIds).toHaveBeenCalledTimes(1);
    expect(userGroups.getUserGroupsByUserIds).toHaveBeenCalledWith(['u-1', 'u-2']);
    expect(userGroups.countUserGroupsByUserIds).not.toHaveBeenCalled();
    expect(result.users.map((user) => user.groupCount)).toEqual([1, 0]);
    expect(usersService.getUsers.mock.calls[0]?.[0].requestedFields).not.toContain('groupCount');
  });

  it('outside a project is one grouped count by user ids', async () => {
    const { handler, userGroups } = userHandler();
    const result = await handler.getUsers({
      scope: organizationScope,
      requestedFields: ['id', 'groupCount'],
    });

    expect(userGroups.countUserGroupsByUserIds).toHaveBeenCalledTimes(1);
    expect(userGroups.countUserGroupsByUserIds).toHaveBeenCalledWith(['u-1', 'u-2']);
    expect(userGroups.getUserGroupsByUserIds).not.toHaveBeenCalled();
    expect(result.users.map((user) => user.groupCount)).toEqual([5, 0]);
  });

  it('is not counted when the list does not ask for it', async () => {
    const { handler, userGroups } = userHandler();
    await handler.getUsers({ scope, requestedFields: ['id', 'name'] });
    expect(userGroups.getUserGroupsByUserIds).not.toHaveBeenCalled();
    expect(userGroups.countUserGroupsByUserIds).not.toHaveBeenCalled();
  });
});
