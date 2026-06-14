import type { IGrantRepository } from '@grantjs/core';
import { Permission, Scope, Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IEntityCacheAdapter } from '@/lib/cache';
import { GrantService } from '@/services/grant.service';
import type { SigningKeyService } from '@/services/signing-keys.service';

const userId = '10000000-0000-4000-8000-000000000001';
const scope: Scope = { tenant: Tenant.Organization, id: '10000000-0000-4000-8000-000000000002' };
const projectScope: Scope = {
  tenant: Tenant.OrganizationProject,
  id: '10000000-0000-4000-8000-000000000002:10000000-0000-4000-8000-000000000003',
};

function buildPermission(id: string): Permission {
  return {
    id,
    name: 'Test',
    description: null,
    action: 'read',
    condition: null,
    resource: { id: 'r1', name: 'Resource', slug: 'resource', description: null },
  } as Permission;
}

describe('GrantService.getUserPermissions', () => {
  let grantRepository: IGrantRepository;
  let service: GrantService;

  beforeEach(() => {
    grantRepository = {
      getUserRoleIdsInScope: vi.fn().mockResolvedValue([]),
      getGroupIdsForRoles: vi.fn().mockResolvedValue([]),
      getDirectGroupIdsForUser: vi.fn().mockResolvedValue([]),
      getPermissionIdsForGroups: vi.fn().mockResolvedValue([]),
      getDirectPermissionIdsForRoles: vi.fn().mockResolvedValue([]),
      getDirectPermissionIdsForUser: vi.fn().mockResolvedValue([]),
      getPermissionsByIds: vi.fn().mockResolvedValue([]),
    } as unknown as IGrantRepository;

    service = new GrantService({} as IEntityCacheAdapter, grantRepository, {} as SigningKeyService);
  });

  it('includes permissions from direct user groups when user has no roles', async () => {
    const directGroupId = 'g-direct';
    const permissionId = 'p-from-group';

    vi.mocked(grantRepository.getDirectGroupIdsForUser).mockResolvedValue([directGroupId]);
    vi.mocked(grantRepository.getPermissionIdsForGroups).mockResolvedValue([permissionId]);
    vi.mocked(grantRepository.getPermissionsByIds).mockResolvedValue([
      buildPermission(permissionId),
    ]);

    const result = await service.getUserPermissions(userId, scope, 'resource', 'read');

    expect(grantRepository.getDirectGroupIdsForUser).toHaveBeenCalledWith(userId, null);
    expect(grantRepository.getPermissionIdsForGroups).toHaveBeenCalledWith([directGroupId]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(permissionId);
  });

  it('dedupes permission ids from role groups and direct user groups', async () => {
    const roleId = 'role-1';
    const sharedGroupId = 'g-shared';
    const roleOnlyGroupId = 'g-role';
    const directOnlyGroupId = 'g-direct';
    const sharedPermissionId = 'p-shared';
    const rolePermissionId = 'p-role';
    const directPermissionId = 'p-direct';

    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue([roleId]);
    vi.mocked(grantRepository.getGroupIdsForRoles).mockResolvedValue([
      sharedGroupId,
      roleOnlyGroupId,
    ]);
    vi.mocked(grantRepository.getDirectGroupIdsForUser).mockResolvedValue([
      sharedGroupId,
      directOnlyGroupId,
    ]);
    vi.mocked(grantRepository.getPermissionIdsForGroups).mockImplementation(async (groupIds) => {
      const ids: string[] = [];
      if (groupIds.includes(sharedGroupId)) ids.push(sharedPermissionId);
      if (groupIds.includes(roleOnlyGroupId)) ids.push(rolePermissionId);
      if (groupIds.includes(directOnlyGroupId)) ids.push(directPermissionId);
      return ids;
    });
    vi.mocked(grantRepository.getDirectPermissionIdsForRoles).mockResolvedValue([]);
    vi.mocked(grantRepository.getDirectPermissionIdsForUser).mockResolvedValue([]);
    vi.mocked(grantRepository.getPermissionsByIds).mockImplementation(async (ids) =>
      ids.map((id) => buildPermission(id))
    );

    const result = await service.getUserPermissions(userId, scope, 'resource', 'read');

    expect(grantRepository.getPermissionIdsForGroups).toHaveBeenCalledWith([
      sharedGroupId,
      roleOnlyGroupId,
      directOnlyGroupId,
    ]);
    expect(result.map((p) => p.id).sort()).toEqual(
      [sharedPermissionId, rolePermissionId, directPermissionId].sort()
    );
  });

  it('passes project id when resolving direct user groups in project scope', async () => {
    vi.mocked(grantRepository.getDirectGroupIdsForUser).mockResolvedValue([]);

    await service.getUserPermissions(
      userId,
      projectScope,
      'resource',
      'read',
      TokenType.ProjectApp
    );

    expect(grantRepository.getDirectGroupIdsForUser).toHaveBeenCalledWith(
      userId,
      '10000000-0000-4000-8000-000000000003'
    );
  });
});
