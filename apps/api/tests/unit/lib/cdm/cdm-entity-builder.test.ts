import type {
  IGroupPermissionService,
  IGroupService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectRolePermissionService,
  IProjectRoleService,
  IProjectUserGroupService,
  IProjectUserPermissionService,
  IRoleGroupService,
  IRolePermissionService,
  IRoleService,
  IUserGroupService,
  IUserPermissionService,
  IUserRoleService,
} from '@grantjs/core';
import { Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { CdmEntityBuilder } from '@/lib/cdm/cdm-entity-builder';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const roleId = '40000000-0000-4000-8000-000000000044';
const groupId = '50000000-0000-4000-8000-000000000055';
const tx = {} as never;

function buildBuilder(importRepo: Partial<ProjectImportRepository>) {
  const repo = {
    listActiveUserRolesForRoleIds: vi.fn().mockResolvedValue([]),
    bulkSoftDeletePivotsForRoles: vi.fn().mockResolvedValue(undefined),
    bulkSoftDeletePivotsForGroups: vi.fn().mockResolvedValue(undefined),
    ...importRepo,
  } as unknown as ProjectImportRepository;

  const projectRoles = {
    removeProjectRole: vi.fn().mockResolvedValue(undefined),
  } as unknown as IProjectRoleService;
  const userRoles = {
    removeUserRole: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUserRoleService;
  const roleGroups = {
    getRoleGroups: vi.fn().mockResolvedValue([]),
    removeRoleGroup: vi.fn().mockResolvedValue(undefined),
  } as unknown as IRoleGroupService;
  const roles = {
    deleteRole: vi.fn().mockResolvedValue(undefined),
  } as unknown as IRoleService;
  const projectGroups = {
    removeProjectGroup: vi.fn().mockResolvedValue(undefined),
  } as unknown as IProjectGroupService;
  const groupPermissions = {
    getGroupPermissions: vi.fn().mockResolvedValue([]),
    removeGroupPermission: vi.fn().mockResolvedValue(undefined),
  } as unknown as IGroupPermissionService;
  const groups = {
    deleteGroup: vi.fn().mockResolvedValue(undefined),
  } as unknown as IGroupService;

  const noop = {} as never;
  const builder = new CdmEntityBuilder(
    repo,
    roles,
    groups,
    roleGroups,
    groupPermissions,
    noop as IRolePermissionService,
    noop as IUserPermissionService,
    projectRoles,
    projectGroups,
    noop as IProjectPermissionService,
    noop as IProjectRolePermissionService,
    noop as IProjectUserPermissionService,
    noop as IProjectResourceService,
    userRoles,
    noop as IUserGroupService,
    noop as IProjectUserGroupService
  );

  return {
    builder,
    repo,
    roles,
    groups,
  };
}

describe('CdmEntityBuilder CDM teardown pivots', () => {
  it('deleteCdmRole sweeps role assignment pivots before deleting the role', async () => {
    const { builder, repo, roles } = buildBuilder({});
    await builder.deleteCdmRole(roleId, projectId, scope, tx);

    expect(repo.bulkSoftDeletePivotsForRoles).toHaveBeenCalledWith([roleId], projectId, tx);
    expect(roles.deleteRole).toHaveBeenCalledWith({ id: roleId }, tx);
  });

  it('deleteCdmGroup sweeps group assignment pivots before deleting the group', async () => {
    const { builder, repo, groups } = buildBuilder({});
    await builder.deleteCdmGroup(groupId, projectId, scope, tx);

    expect(repo.bulkSoftDeletePivotsForGroups).toHaveBeenCalledWith([groupId], projectId, tx);
    expect(groups.deleteGroup).toHaveBeenCalledWith({ id: groupId }, tx);
  });
});
