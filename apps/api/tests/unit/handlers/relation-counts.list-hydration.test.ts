/**
 * The relationship counts a list shows (a group's users; a permission's groups and users) are one
 * grouped count per page, in the list's scope, and only when the list asks for them.
 */
import { type Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { GroupHandler } from '@/handlers/groups.handler';
import { PermissionHandler } from '@/handlers/permissions.handler';

const scope: Scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };

const page = <T extends { id: string }>(key: string, items: T[]) => ({
  [key]: items,
  totalCount: items.length,
  hasNextPage: false,
});

function groupHandler() {
  const groups = {
    getGroups: vi.fn().mockResolvedValue(
      page('groups', [
        { id: 'g-1', name: 'Editors' },
        { id: 'g-2', name: 'Viewers' },
      ])
    ),
  };
  const groupPermissions = { countGroupPermissionsByGroupIds: vi.fn() };
  const userGroups = {
    countUsersByGroupIds: vi.fn().mockResolvedValue(new Map([['g-1', 3]])),
  };
  const handler = new GroupHandler(
    {} as never,
    groups as never,
    {} as never,
    {} as never,
    groupPermissions as never,
    {} as never,
    userGroups as never,
    {} as never,
    {} as never,
    {} as never
  );
  return { handler, groups, groupPermissions, userGroups };
}

function permissionHandler() {
  const permissions = {
    getPermissions: vi.fn().mockResolvedValue(
      page('permissions', [
        { id: 'p-1', name: 'Read' },
        { id: 'p-2', name: 'Write' },
      ])
    ),
  };
  const groupPermissions = {
    countGroupsByPermissionIds: vi.fn().mockResolvedValue(new Map([['p-2', 4]])),
  };
  const userPermissions = {
    countUsersByPermissionIds: vi.fn().mockResolvedValue(new Map([['p-1', 5]])),
  };
  const handler = new PermissionHandler(
    {} as never,
    permissions as never,
    {} as never,
    {} as never,
    groupPermissions as never,
    {} as never,
    userPermissions as never,
    {} as never,
    {} as never,
    {} as never
  );
  return { handler, permissions, groupPermissions, userPermissions };
}

describe('Group.userCount in the group list', () => {
  it('is one count for the page, in the list scope, zero for a group with no members', async () => {
    const { handler, groups, userGroups } = groupHandler();
    const result = await handler.getGroups({ scope, requestedFields: ['id', 'userCount'] });

    expect(userGroups.countUsersByGroupIds).toHaveBeenCalledTimes(1);
    expect(userGroups.countUsersByGroupIds).toHaveBeenCalledWith(['g-1', 'g-2'], scope);
    expect(result.groups.map((group) => group.userCount)).toEqual([3, 0]);
    expect(groups.getGroups.mock.calls[0]?.[0].requestedFields).not.toContain('userCount');
  });

  it('is not counted when the list does not ask for it', async () => {
    const { handler, userGroups } = groupHandler();
    await handler.getGroups({ scope, requestedFields: ['id', 'name'] });
    expect(userGroups.countUsersByGroupIds).not.toHaveBeenCalled();
  });
});

describe('Permission.groupCount and Permission.userCount in the permission list', () => {
  it('are one count each for the page, in the list scope', async () => {
    const { handler, groupPermissions, userPermissions } = permissionHandler();
    const result = await handler.getPermissions({
      scope,
      requestedFields: ['id', 'groupCount', 'userCount'],
    });

    expect(groupPermissions.countGroupsByPermissionIds).toHaveBeenCalledTimes(1);
    expect(groupPermissions.countGroupsByPermissionIds).toHaveBeenCalledWith(['p-1', 'p-2'], scope);
    expect(userPermissions.countUsersByPermissionIds).toHaveBeenCalledTimes(1);
    expect(userPermissions.countUsersByPermissionIds).toHaveBeenCalledWith(['p-1', 'p-2'], scope);
    expect(result.permissions.map((p) => [p.groupCount, p.userCount])).toEqual([
      [0, 5],
      [4, 0],
    ]);
  });

  it('counts only what the list asks for', async () => {
    const { handler, groupPermissions, userPermissions } = permissionHandler();
    await handler.getPermissions({ scope, requestedFields: ['id', 'userCount'] });
    expect(groupPermissions.countGroupsByPermissionIds).not.toHaveBeenCalled();
    expect(userPermissions.countUsersByPermissionIds).toHaveBeenCalledTimes(1);
  });
});
