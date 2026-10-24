import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { RoleHandler } from '@/handlers/roles.handler';

const roleId = '10000000-0000-4000-8000-0000000000d1';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const accountId = '10000000-0000-4000-8000-0000000000d3';
const permissionId = '10000000-0000-4000-8000-0000000000d4';
const groupId = '10000000-0000-4000-8000-0000000000d5';
const memberA = '10000000-0000-4000-8000-0000000000e1';
const scope = { tenant: Tenant.OrganizationProject, id: `${accountId}:${projectId}` };

function build() {
  const calls: string[] = [];
  const track = (label: string) => vi.fn().mockImplementation(async () => void calls.push(label));
  const roleTags = { getRoleTags: vi.fn().mockResolvedValue([]), removeRoleTag: vi.fn() };
  const roleGroups = {
    getRoleGroups: vi.fn().mockResolvedValue([{ roleId, groupId }]),
    removeRoleGroup: track('removeRoleGroup'),
  };
  const rolePermissions = {
    getRolePermissions: vi.fn().mockResolvedValue([{ roleId, permissionId }]),
    revokeRolePermission: track('revokeRolePermission'),
  };
  const userRoles = {
    getUserRoles: vi.fn().mockResolvedValue([{ userId: memberA, roleId }]),
    removeUserRole: track('removeUserRole'),
  };
  const roles = {
    deleteRole: vi.fn().mockImplementation(async () => (calls.push('deleteRole'), {})),
  };
  const projectRoles = { removeProjectRole: track('removeProjectRole') };
  const permissionsClear = vi
    .fn()
    .mockImplementation(async () => void calls.push('permissions.clear'));
  const cache = {
    roles: { has: vi.fn().mockResolvedValue(false) },
    permissions: { clear: permissionsClear },
  };
  const tx = { __tx: true };

  const handler = new RoleHandler(
    roleTags as never,
    roles as never,
    {} as never,
    projectRoles as never,
    roleGroups as never,
    rolePermissions as never,
    {} as never,
    {} as never,
    userRoles as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return { handler, userRoles, rolePermissions, roleGroups, roles, permissionsClear, calls, tx };
}

describe('RoleHandler.deleteRole cascade', () => {
  it('clears the permissions authz cache after cascade', async () => {
    const { handler, permissionsClear, calls, userRoles, tx } = build();

    await handler.deleteRole({ id: roleId, scope } as never);

    expect(userRoles.removeUserRole).toHaveBeenCalledWith({ userId: memberA, roleId }, tx);
    expect(permissionsClear).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('permissions.clear')).toBeLessThan(calls.indexOf('deleteRole'));
    expect(calls.indexOf('deleteRole')).toBe(calls.length - 1);
  });

  it('revokes every member and never overlaps more than the cascade chunk', async () => {
    const members = Array.from({ length: 75 }, (_, index) => `user-${index}`);
    const { handler, userRoles } = build();
    userRoles.getUserRoles.mockResolvedValue(members.map((userId) => ({ userId, roleId })));
    let inFlight = 0;
    let maxInFlight = 0;
    userRoles.removeUserRole.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });

    await handler.deleteRole({ id: roleId, scope } as never);

    expect(userRoles.removeUserRole).toHaveBeenCalledTimes(75);
    expect(maxInFlight).toBeLessThanOrEqual(config.system.iamCascadeChunkSize);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('clears the permissions authz cache when the role has no remaining relations', async () => {
    const { handler, permissionsClear, roleGroups, rolePermissions, userRoles } = build();
    roleGroups.getRoleGroups.mockResolvedValue([]);
    rolePermissions.getRolePermissions.mockResolvedValue([]);
    userRoles.getUserRoles.mockResolvedValue([]);

    await handler.deleteRole({ id: roleId, scope } as never);

    expect(permissionsClear).toHaveBeenCalledTimes(1);
  });
});
