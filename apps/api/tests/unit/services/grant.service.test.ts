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
      getPermissionIdsForApiKey: vi.fn().mockResolvedValue([]),
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
    expect(grantRepository.getGroupIdsForRoles).not.toHaveBeenCalled();
    expect(grantRepository.getDirectPermissionIdsForRoles).not.toHaveBeenCalled();
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
    expect(grantRepository.getUserRoleIdsInScope).toHaveBeenCalledWith(
      userId,
      projectScope,
      undefined,
      { tokenType: TokenType.ProjectApp }
    );
    expect(grantRepository.getDirectPermissionIdsForUser).toHaveBeenCalledWith(
      userId,
      '10000000-0000-4000-8000-000000000003'
    );
  });

  it('unions permissions from all four sources', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue(['role-1']);
    vi.mocked(grantRepository.getGroupIdsForRoles).mockResolvedValue(['g-role']);
    vi.mocked(grantRepository.getDirectGroupIdsForUser).mockResolvedValue(['g-user']);
    vi.mocked(grantRepository.getPermissionIdsForGroups).mockImplementation(async (groupIds) => {
      const ids: string[] = [];
      if (groupIds.includes('g-role')) ids.push('p-role-group');
      if (groupIds.includes('g-user')) ids.push('p-user-group');
      return ids;
    });
    vi.mocked(grantRepository.getDirectPermissionIdsForRoles).mockResolvedValue(['p-role']);
    vi.mocked(grantRepository.getDirectPermissionIdsForUser).mockResolvedValue(['p-user']);
    vi.mocked(grantRepository.getPermissionsByIds).mockImplementation(async (ids) =>
      ids.map((id) => buildPermission(id))
    );

    const result = await service.getUserPermissions(userId, scope, 'resource', 'read');

    expect(grantRepository.getPermissionIdsForGroups).toHaveBeenCalledWith(['g-role', 'g-user']);
    expect(vi.mocked(grantRepository.getPermissionsByIds).mock.calls[0]?.[0].sort()).toEqual(
      ['p-role-group', 'p-user-group', 'p-role', 'p-user'].sort()
    );
    expect(result.map((permission) => permission.id).sort()).toEqual(
      ['p-role-group', 'p-user-group', 'p-role', 'p-user'].sort()
    );
  });

  it('overlaps independent repository queries on a full-source miss', async () => {
    const events: string[] = [];
    const delayMs = 40;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const delayed = <T>(name: string, value: T) =>
      vi.fn(async () => {
        events.push(`${name}:start`);
        await delay(delayMs);
        events.push(`${name}:end`);
        return value;
      });

    grantRepository.getUserRoleIdsInScope = delayed('roles', ['role-1']);
    grantRepository.getDirectGroupIdsForUser = delayed('userGroups', ['g-user']);
    grantRepository.getDirectPermissionIdsForUser = delayed('userPerms', ['p-user']);
    grantRepository.getGroupIdsForRoles = delayed('roleGroups', ['g-role']);
    grantRepository.getDirectPermissionIdsForRoles = delayed('rolePerms', ['p-role']);
    grantRepository.getPermissionIdsForGroups = delayed('groupPerms', ['p-group']);
    vi.mocked(grantRepository.getPermissionsByIds).mockImplementation(async (ids) =>
      ids.map((id) => buildPermission(id))
    );

    const startedAt = Date.now();
    const result = await service.getUserPermissions(userId, scope, 'resource', 'read');
    const elapsedMs = Date.now() - startedAt;

    const firstWave1End = Math.min(
      events.indexOf('roles:end'),
      events.indexOf('userGroups:end'),
      events.indexOf('userPerms:end')
    );
    expect(events.indexOf('roles:start')).toBeLessThan(firstWave1End);
    expect(events.indexOf('userGroups:start')).toBeLessThan(firstWave1End);
    expect(events.indexOf('userPerms:start')).toBeLessThan(firstWave1End);

    const firstWave2End = Math.min(
      events.indexOf('roleGroups:end'),
      events.indexOf('rolePerms:end')
    );
    expect(events.indexOf('roleGroups:start')).toBeLessThan(firstWave2End);
    expect(events.indexOf('rolePerms:start')).toBeLessThan(firstWave2End);
    expect(events.indexOf('roles:end')).toBeLessThan(events.indexOf('roleGroups:start'));
    expect(events.indexOf('roles:end')).toBeLessThan(events.indexOf('rolePerms:start'));

    expect(events.indexOf('roleGroups:end')).toBeLessThan(events.indexOf('groupPerms:start'));
    expect(events.indexOf('userGroups:end')).toBeLessThan(events.indexOf('groupPerms:start'));

    // Sequential seven-call chain would be ≥ 7 × delayMs. Four waves of delayMs
    // (three overlapping pairs plus two dependents) must finish well under that.
    expect(elapsedMs).toBeLessThan(delayMs * 5);
    expect(result.map((permission) => permission.id).sort()).toEqual(
      ['p-group', 'p-role', 'p-user'].sort()
    );
  });

  it('rejects when a repository lookup fails instead of returning empty', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockRejectedValue(
      new Error('role lookup failed')
    );

    await expect(service.getUserPermissions(userId, scope, 'resource', 'read')).rejects.toThrow(
      'role lookup failed'
    );
    expect(grantRepository.getPermissionsByIds).not.toHaveBeenCalled();
  });

  it('passes project id to role-direct permissions for API-key tokens', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue(['role-1']);

    await service.getUserPermissions(userId, projectScope, 'resource', 'read', TokenType.ApiKey);

    expect(grantRepository.getUserRoleIdsInScope).toHaveBeenCalledWith(
      userId,
      projectScope,
      undefined,
      { tokenType: TokenType.ApiKey }
    );
    expect(grantRepository.getDirectPermissionIdsForRoles).toHaveBeenCalledWith(
      ['role-1'],
      '10000000-0000-4000-8000-000000000003'
    );
  });
});

describe('GrantService.collectPermissionIds', () => {
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
      getPermissionIdsForApiKey: vi.fn().mockResolvedValue([]),
      getPermissionsByIds: vi.fn().mockResolvedValue([]),
    } as unknown as IGrantRepository;
    service = new GrantService({} as IEntityCacheAdapter, grantRepository, {} as SigningKeyService);
  });

  it('returns the union of role, group and direct permission ids, once each', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue(['role-1']);
    vi.mocked(grantRepository.getGroupIdsForRoles).mockResolvedValue(['g-role']);
    vi.mocked(grantRepository.getDirectGroupIdsForUser).mockResolvedValue(['g-user']);
    vi.mocked(grantRepository.getPermissionIdsForGroups).mockResolvedValue(['p-group', 'p-shared']);
    vi.mocked(grantRepository.getDirectPermissionIdsForRoles).mockResolvedValue([
      'p-role',
      'p-shared',
    ]);
    vi.mocked(grantRepository.getDirectPermissionIdsForUser).mockResolvedValue(['p-user']);

    const ids = await service.collectPermissionIds(userId, projectScope, TokenType.ApiKey);

    expect(ids.sort()).toEqual(['p-group', 'p-role', 'p-shared', 'p-user']);
    expect(grantRepository.getUserRoleIdsInScope).toHaveBeenCalledWith(
      userId,
      projectScope,
      undefined,
      { tokenType: TokenType.ApiKey }
    );
    expect(grantRepository.getDirectPermissionIdsForRoles).toHaveBeenCalledWith(
      ['role-1'],
      '10000000-0000-4000-8000-000000000003'
    );
  });

  it('is the collection getUserPermissions filters from', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue(['role-1']);
    vi.mocked(grantRepository.getDirectPermissionIdsForRoles).mockResolvedValue(['p-role']);
    vi.mocked(grantRepository.getDirectPermissionIdsForUser).mockResolvedValue(['p-user']);

    const ids = await service.collectPermissionIds(userId, scope);
    await service.getUserPermissions(userId, scope, 'resource', 'read');

    expect(grantRepository.getPermissionsByIds).toHaveBeenCalledWith(
      expect.arrayContaining(ids),
      'read',
      'resource'
    );
    expect(vi.mocked(grantRepository.getPermissionsByIds).mock.calls[0][0]).toHaveLength(
      ids.length
    );
  });

  it('returns nothing for a principal with no roles, groups or permissions', async () => {
    await expect(service.collectPermissionIds(userId, scope)).resolves.toEqual([]);
  });
});

describe('GrantService.collectPermissionIds for a project key', () => {
  const accountProjectScope: Scope = {
    tenant: Tenant.AccountProject,
    id: '10000000-0000-4000-8000-000000000004:10000000-0000-4000-8000-000000000003',
  };
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
      getPermissionIdsForApiKey: vi.fn().mockResolvedValue(['p-key-1', 'p-key-2']),
      getPermissionsByIds: vi.fn().mockResolvedValue([]),
    } as unknown as IGrantRepository;
    service = new GrantService({} as IEntityCacheAdapter, grantRepository, {} as SigningKeyService);
  });

  it.each([
    ['organization', projectScope],
    ['account', accountProjectScope],
  ])(
    'resolves exactly the permissions of a key without a role in an %s project',
    async (_label, keyScope) => {
      const ids = await service.collectPermissionIds(userId, keyScope, TokenType.ApiKey);

      expect(ids.sort()).toEqual(['p-key-1', 'p-key-2']);
      expect(grantRepository.getPermissionIdsForApiKey).toHaveBeenCalledWith(userId, keyScope);
      expect(grantRepository.getGroupIdsForRoles).not.toHaveBeenCalled();
      expect(grantRepository.getPermissionIdsForGroups).not.toHaveBeenCalled();
      expect(grantRepository.getDirectPermissionIdsForRoles).not.toHaveBeenCalled();
    }
  );

  it('leaves a role key as it was: its role resolves, and the key row adds nothing', async () => {
    vi.mocked(grantRepository.getUserRoleIdsInScope).mockResolvedValue(['role-1']);
    vi.mocked(grantRepository.getGroupIdsForRoles).mockResolvedValue(['g-role']);
    vi.mocked(grantRepository.getPermissionIdsForGroups).mockResolvedValue(['p-group']);
    vi.mocked(grantRepository.getPermissionIdsForApiKey).mockResolvedValue([]);

    const ids = await service.collectPermissionIds(userId, projectScope, TokenType.ApiKey);

    expect(ids).toEqual(['p-group']);
  });

  it.each([
    ['a session', TokenType.Session],
    ['a project app', TokenType.ProjectApp],
    ['a token of no type', undefined],
  ])('does not read a key row for %s', async (_label, tokenType) => {
    const ids = await service.collectPermissionIds(userId, projectScope, tokenType);

    expect(ids).toEqual([]);
    expect(grantRepository.getPermissionIdsForApiKey).not.toHaveBeenCalled();
  });

  it.each([
    ['organization', scope],
    ['project user', { tenant: Tenant.ProjectUser, id: `${userId}:${userId}` } as Scope],
    ['organization project user', { tenant: Tenant.OrganizationProjectUser, id: 'o:p:u' } as Scope],
  ])('does not read a key row in an %s scope', async (_label, otherScope) => {
    await service.collectPermissionIds(userId, otherScope, TokenType.ApiKey);

    expect(grantRepository.getPermissionIdsForApiKey).not.toHaveBeenCalled();
  });

  it('is what the authorization check filters from', async () => {
    vi.mocked(grantRepository.getPermissionsByIds).mockResolvedValue([buildPermission('p-key-1')]);

    const result = await service.getUserPermissions(
      userId,
      projectScope,
      'resource',
      'read',
      TokenType.ApiKey
    );

    expect(vi.mocked(grantRepository.getPermissionsByIds).mock.calls[0][0].sort()).toEqual([
      'p-key-1',
      'p-key-2',
    ]);
    expect(result.map((permission) => permission.id)).toEqual(['p-key-1']);
  });
});

describe('GrantService.collectRolePermissionIds', () => {
  it('resolves roles through their groups and project-filtered direct permissions only', async () => {
    const grantRepository = {
      getUserRoleIdsInScope: vi.fn(),
      getGroupIdsForRoles: vi.fn().mockResolvedValue(['g-role']),
      getDirectGroupIdsForUser: vi.fn(),
      getPermissionIdsForGroups: vi.fn().mockResolvedValue(['p-group']),
      getDirectPermissionIdsForRoles: vi.fn().mockResolvedValue(['p-role']),
      getDirectPermissionIdsForUser: vi.fn(),
    } as unknown as IGrantRepository;
    const service = new GrantService(
      {} as IEntityCacheAdapter,
      grantRepository,
      {} as SigningKeyService
    );

    const ids = await service.collectRolePermissionIds(['role-1', 'role-2'], projectScope);

    expect(ids.sort()).toEqual(['p-group', 'p-role']);
    expect(grantRepository.getGroupIdsForRoles).toHaveBeenCalledWith(['role-1', 'role-2']);
    expect(grantRepository.getPermissionIdsForGroups).toHaveBeenCalledWith(['g-role']);
    expect(grantRepository.getDirectPermissionIdsForRoles).toHaveBeenCalledWith(
      ['role-1', 'role-2'],
      '10000000-0000-4000-8000-000000000003'
    );
    expect(grantRepository.getUserRoleIdsInScope).not.toHaveBeenCalled();
    expect(grantRepository.getDirectGroupIdsForUser).not.toHaveBeenCalled();
    expect(grantRepository.getDirectPermissionIdsForUser).not.toHaveBeenCalled();
  });

  it('returns nothing for no roles without reading the repository', async () => {
    const grantRepository = { getGroupIdsForRoles: vi.fn() } as unknown as IGrantRepository;
    const service = new GrantService(
      {} as IEntityCacheAdapter,
      grantRepository,
      {} as SigningKeyService
    );

    await expect(service.collectRolePermissionIds([], projectScope)).resolves.toEqual([]);
    expect(grantRepository.getGroupIdsForRoles).not.toHaveBeenCalled();
  });
});
