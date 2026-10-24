import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { GroupHandler } from '@/handlers/groups.handler';

const groupId = '10000000-0000-4000-8000-0000000000d1';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const accountId = '10000000-0000-4000-8000-0000000000d3';
const permissionId = '10000000-0000-4000-8000-0000000000d4';
const roleId = '10000000-0000-4000-8000-0000000000d5';
const memberA = '10000000-0000-4000-8000-0000000000e1';
const memberB = '10000000-0000-4000-8000-0000000000e2';
const scope = { tenant: Tenant.OrganizationProject, id: `${accountId}:${projectId}` };

function build() {
  const calls: string[] = [];
  const track = (label: string) => vi.fn().mockImplementation(async () => void calls.push(label));
  const groupTags = { getGroupTags: vi.fn().mockResolvedValue([]), removeGroupTag: vi.fn() };
  const groupPermissions = {
    getGroupPermissions: vi.fn().mockResolvedValue([{ groupId, permissionId }]),
    removeGroupPermission: track('removeGroupPermission'),
  };
  const roleGroups = {
    getRoleGroups: vi.fn().mockResolvedValue([{ roleId, groupId }]),
    removeRoleGroup: track('removeRoleGroup'),
  };
  const userGroups = {
    getUserGroups: vi.fn().mockResolvedValue([
      { userId: memberA, groupId },
      { userId: memberB, groupId },
    ]),
    removeUserGroup: track('removeUserGroup'),
  };
  const groups = {
    deleteGroup: vi.fn().mockImplementation(async () => (calls.push('deleteGroup'), {})),
  };
  const projectGroups = { removeProjectGroup: track('removeProjectGroup') };
  const permissionsClear = vi
    .fn()
    .mockImplementation(async () => void calls.push('permissions.clear'));
  const cache = {
    groups: { has: vi.fn().mockResolvedValue(false) },
    permissions: { clear: permissionsClear },
  };
  const tx = { __tx: true };

  const handler = new GroupHandler(
    groupTags as never,
    groups as never,
    {} as never,
    projectGroups as never,
    groupPermissions as never,
    roleGroups as never,
    userGroups as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return { handler, userGroups, groupPermissions, roleGroups, groups, permissionsClear, calls, tx };
}

describe('GroupHandler.deleteGroup cascade', () => {
  it('removes every membership in the same transaction, one revoke per member, before the group goes', async () => {
    const { handler, userGroups, groups, calls, tx } = build();

    await handler.deleteGroup({ id: groupId, scope } as never);

    expect(userGroups.getUserGroups).toHaveBeenCalledWith({ groupId }, tx);
    expect(userGroups.removeUserGroup).toHaveBeenCalledTimes(2);
    expect(userGroups.removeUserGroup).toHaveBeenCalledWith({ userId: memberA, groupId }, tx);
    expect(userGroups.removeUserGroup).toHaveBeenCalledWith({ userId: memberB, groupId }, tx);
    expect(calls.indexOf('deleteGroup')).toBe(calls.length - 1);
    expect(groups.deleteGroup).toHaveBeenCalledTimes(1);
  });

  it('still removes the role links and the permissions, which already emitted their revokes', async () => {
    const { handler, groupPermissions, roleGroups, tx } = build();

    await handler.deleteGroup({ id: groupId, scope } as never);

    expect(roleGroups.removeRoleGroup).toHaveBeenCalledWith({ roleId, groupId }, tx);
    expect(groupPermissions.removeGroupPermission).toHaveBeenCalledWith(
      { groupId, permissionId },
      tx
    );
  });

  it('removes the memberships of a group that has none to remove without error', async () => {
    const { handler, userGroups, groups } = build();
    userGroups.getUserGroups.mockResolvedValue([]);

    await handler.deleteGroup({ id: groupId, scope } as never);

    expect(userGroups.removeUserGroup).not.toHaveBeenCalled();
    expect(groups.deleteGroup).toHaveBeenCalledTimes(1);
  });

  it('clears the permissions authz cache after cascade', async () => {
    const { handler, permissionsClear, calls } = build();

    await handler.deleteGroup({ id: groupId, scope } as never);

    expect(permissionsClear).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('permissions.clear')).toBeLessThan(calls.indexOf('deleteGroup'));
  });

  it('clears the permissions authz cache when the group has no remaining relations', async () => {
    const { handler, permissionsClear, groupPermissions, roleGroups, userGroups } = build();
    groupPermissions.getGroupPermissions.mockResolvedValue([]);
    roleGroups.getRoleGroups.mockResolvedValue([]);
    userGroups.getUserGroups.mockResolvedValue([]);

    await handler.deleteGroup({ id: groupId, scope } as never);

    expect(permissionsClear).toHaveBeenCalledTimes(1);
  });
});
