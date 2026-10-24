import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { PermissionHandler } from '@/handlers/permissions.handler';

const permissionId = '10000000-0000-4000-8000-0000000000d1';
const projectId = '10000000-0000-4000-8000-0000000000d2';
const accountId = '10000000-0000-4000-8000-0000000000d3';
const groupId = '10000000-0000-4000-8000-0000000000d4';
const roleId = '10000000-0000-4000-8000-0000000000d5';
const memberA = '10000000-0000-4000-8000-0000000000e1';
const scope = { tenant: Tenant.OrganizationProject, id: `${accountId}:${projectId}` };

function build() {
  const calls: string[] = [];
  const track = (label: string) => vi.fn().mockImplementation(async () => void calls.push(label));
  const permissionTags = {
    getPermissionTags: vi.fn().mockResolvedValue([]),
    removePermissionTag: vi.fn(),
  };
  const groupPermissions = {
    getGroupPermissions: vi.fn().mockResolvedValue([{ groupId, permissionId }]),
    removeGroupPermission: track('removeGroupPermission'),
  };
  const rolePermissions = {
    getRolePermissions: vi.fn().mockResolvedValue([{ roleId, permissionId }]),
    revokeRolePermission: track('revokeRolePermission'),
  };
  const userPermissions = {
    getUserPermissions: vi.fn().mockResolvedValue([{ userId: memberA, permissionId }]),
    revokeUserPermission: track('revokeUserPermission'),
  };
  const permissions = {
    deletePermission: vi.fn().mockImplementation(async () => (calls.push('deletePermission'), {})),
  };
  const projectPermissions = { removeProjectPermission: track('removeProjectPermission') };
  const permissionsClear = vi
    .fn()
    .mockImplementation(async () => void calls.push('permissions.clear'));
  const cache = {
    permissions: {
      has: vi.fn().mockResolvedValue(false),
      clear: permissionsClear,
    },
  };
  const tx = { __tx: true };

  const handler = new PermissionHandler(
    permissionTags as never,
    permissions as never,
    {} as never,
    projectPermissions as never,
    groupPermissions as never,
    rolePermissions as never,
    userPermissions as never,
    cache as never,
    {} as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never
  );
  return {
    handler,
    groupPermissions,
    rolePermissions,
    userPermissions,
    permissions,
    permissionsClear,
    calls,
    tx,
  };
}

describe('PermissionHandler.deletePermission cascade', () => {
  it('clears the permissions authz cache after cascade', async () => {
    const { handler, permissionsClear, calls, userPermissions, tx } = build();

    await handler.deletePermission({ id: permissionId, scope } as never);

    expect(userPermissions.revokeUserPermission).toHaveBeenCalledWith(
      { userId: memberA, permissionId, scope },
      tx
    );
    expect(permissionsClear).toHaveBeenCalledTimes(1);
    expect(calls.indexOf('permissions.clear')).toBeLessThan(calls.indexOf('deletePermission'));
    expect(calls.indexOf('deletePermission')).toBe(calls.length - 1);
  });

  it('revokes every subject and never overlaps more than the cascade chunk', async () => {
    const members = Array.from({ length: 75 }, (_, index) => `user-${index}`);
    const { handler, userPermissions } = build();
    userPermissions.getUserPermissions.mockResolvedValue(
      members.map((userId) => ({ userId, permissionId }))
    );
    let inFlight = 0;
    let maxInFlight = 0;
    userPermissions.revokeUserPermission.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });

    await handler.deletePermission({ id: permissionId, scope } as never);

    expect(userPermissions.revokeUserPermission).toHaveBeenCalledTimes(75);
    expect(maxInFlight).toBeLessThanOrEqual(config.system.iamCascadeChunkSize);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('clears the permissions authz cache when the permission has no remaining relations', async () => {
    const { handler, permissionsClear, groupPermissions, rolePermissions, userPermissions } =
      build();
    groupPermissions.getGroupPermissions.mockResolvedValue([]);
    rolePermissions.getRolePermissions.mockResolvedValue([]);
    userPermissions.getUserPermissions.mockResolvedValue([]);

    await handler.deletePermission({ id: permissionId, scope } as never);

    expect(permissionsClear).toHaveBeenCalledTimes(1);
  });
});
