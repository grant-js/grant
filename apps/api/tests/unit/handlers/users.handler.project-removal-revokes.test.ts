import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserHandler } from '@/handlers/users.handler';
import { NotFoundError } from '@/lib/errors';

const userId = '10000000-0000-4000-8000-0000000000f1';
const projectId = '10000000-0000-4000-8000-0000000000f2';
const accountId = '10000000-0000-4000-8000-0000000000f3';
const roleId = '10000000-0000-4000-8000-0000000000f4';
const otherRoleId = '10000000-0000-4000-8000-0000000000f5';
const groupId = '10000000-0000-4000-8000-0000000000f6';
const permissionId = '10000000-0000-4000-8000-0000000000f7';
const scope = { tenant: Tenant.OrganizationProject, id: `${accountId}:${projectId}` };

function build() {
  const calls: string[] = [];
  const track = (label: string) =>
    vi.fn().mockImplementation(async () => {
      calls.push(label);
    });
  const tx = { __tx: true };

  const userRoles = { removeUserRole: track('removeUserRole') };
  const userGroups = { removeUserGroup: track('removeUserGroup') };
  const userPermissions = { revokeUserPermission: track('revokeUserPermission') };
  const projectUserGroups = {
    getProjectUserGroups: vi.fn().mockResolvedValue([{ projectId, userId, groupId }]),
    removeProjectUserGroup: track('removeProjectUserGroup'),
  };
  const projectUserPermissions = {
    getProjectUserPermissions: vi.fn().mockResolvedValue([{ projectId, userId, permissionId }]),
    removeProjectUserPermission: track('removeProjectUserPermission'),
  };
  const projectUsers = {
    removeProjectUser: track('removeProjectUser'),
    getProjectUsers: vi.fn().mockResolvedValue([]),
  };
  const users = {
    getUsers: vi.fn().mockResolvedValue({ users: [{ id: userId }] }),
  };
  const scopeServices = {
    projectRoles: { getProjectRoles: vi.fn().mockResolvedValue([{ projectId, roleId }]) },
    userRoles: {
      getUserRoles: vi.fn().mockResolvedValue([
        { userId, roleId },
        { userId, roleId: otherRoleId },
      ]),
    },
  };
  const cache = {
    permissions: {
      clear: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    },
    users: { has: vi.fn().mockResolvedValue(false) },
    roles: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() },
  };

  const handler = new UserHandler(
    {} as never,
    users as never,
    {} as never,
    projectUsers as never,
    userRoles as never,
    userGroups as never,
    userPermissions as never,
    projectUserPermissions as never,
    projectUserGroups as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    cache as never,
    scopeServices as never,
    { withTransaction: async <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx) } as never,
    {} as never,
    {} as never,
    {} as never
  );
  return {
    handler,
    calls,
    tx,
    userRoles,
    userGroups,
    userPermissions,
    projectUserGroups,
    projectUserPermissions,
    cache,
  };
}

describe('UserHandler.deleteUser at project scope', () => {
  it('revokes the project roles, groups and permissions through the pivot services before removing the member', async () => {
    const h = build();

    await h.handler.deleteUser({ id: userId, scope } as never);

    // Only the role that belongs to this project: the other one is left alone.
    expect(h.userRoles.removeUserRole).toHaveBeenCalledTimes(1);
    expect(h.userRoles.removeUserRole).toHaveBeenCalledWith({ userId, roleId }, h.tx);
    expect(h.userGroups.removeUserGroup).toHaveBeenCalledWith({ userId, groupId }, h.tx);
    expect(h.projectUserGroups.removeProjectUserGroup).toHaveBeenCalledWith(
      { projectId, userId, groupId },
      h.tx
    );
    expect(h.userPermissions.revokeUserPermission).toHaveBeenCalledWith(
      { userId, permissionId, scope },
      h.tx
    );
    expect(h.projectUserPermissions.removeProjectUserPermission).toHaveBeenCalledWith(
      { projectId, userId, permissionId },
      h.tx
    );
    expect(h.calls[h.calls.length - 1]).toBe('removeProjectUser');
    expect(h.calls.filter((c) => c === 'removeProjectUser')).toHaveLength(1);
    expect(h.cache.permissions.keys).toHaveBeenCalled();
    expect(h.cache.permissions.clear).not.toHaveBeenCalled();
  });

  it('tolerates a project row whose global membership is already gone, and still removes the member', async () => {
    const h = build();
    h.userGroups.removeUserGroup.mockRejectedValue(new NotFoundError('UserGroup'));
    h.userPermissions.revokeUserPermission.mockRejectedValue(new NotFoundError('Permission'));

    await h.handler.deleteUser({ id: userId, scope } as never);

    expect(h.projectUserGroups.removeProjectUserGroup).toHaveBeenCalled();
    expect(h.projectUserPermissions.removeProjectUserPermission).toHaveBeenCalled();
    expect(h.calls[h.calls.length - 1]).toBe('removeProjectUser');
  });

  it('does not swallow any other failure: the transaction must roll back', async () => {
    const h = build();
    h.userGroups.removeUserGroup.mockRejectedValue(new Error('db down'));

    await expect(h.handler.deleteUser({ id: userId, scope } as never)).rejects.toThrow('db down');
    expect(h.calls).not.toContain('removeProjectUser');
  });

  it('removes a member who holds nothing without touching the permission cache', async () => {
    const h = build();
    h.projectUserGroups.getProjectUserGroups.mockResolvedValue([]);
    h.projectUserPermissions.getProjectUserPermissions.mockResolvedValue([]);
    (
      h.handler as unknown as {
        scopeServices: { userRoles: { getUserRoles: ReturnType<typeof vi.fn> } };
      }
    ).scopeServices.userRoles.getUserRoles.mockResolvedValue([]);

    await h.handler.deleteUser({ id: userId, scope } as never);

    expect(h.calls).toEqual(['removeProjectUser']);
    expect(h.cache.permissions.keys).not.toHaveBeenCalled();
    expect(h.cache.permissions.clear).not.toHaveBeenCalled();
  });
});
