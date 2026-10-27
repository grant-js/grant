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
import { describe, expect, it, vi } from 'vitest';

import { CdmEntityBuilder } from '@/lib/cdm/cdm-entity-builder';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';

const projectId = '10000000-0000-4000-8000-000000000011';
const groupId = '50000000-0000-4000-8000-000000000055';
const tx = {} as never;

function perm(id: string, resourceId: string) {
  return { id, resourceId, resourceSlug: 'doc', action: 'read', condition: null };
}

function build() {
  const groupPermissions = {
    addGroupPermissionsForCdmImport: vi.fn().mockResolvedValue([{ id: 'gp-1' }, { id: 'gp-2' }]),
    getGroupPermissions: vi.fn(),
    addGroupPermission: vi.fn(),
  };
  const projectPermissions = {
    getProjectPermissions: vi.fn().mockResolvedValue([]),
    addProjectPermissionsForCdmImport: vi.fn().mockResolvedValue([]),
    addProjectPermission: vi.fn(),
  };
  const projectResources = {
    getProjectResources: vi.fn().mockResolvedValue([]),
    addProjectResourcesForCdmImport: vi.fn().mockResolvedValue([]),
    addProjectResource: vi.fn(),
  };
  const groups = {
    createGroup: vi.fn().mockResolvedValue({ id: groupId }),
  };
  const projectGroups = {
    addProjectGroup: vi.fn().mockResolvedValue(undefined),
  };
  const builder = new CdmEntityBuilder(
    {} as ProjectImportRepository,
    {} as IRoleService,
    groups as unknown as IGroupService,
    {} as IRoleGroupService,
    groupPermissions as unknown as IGroupPermissionService,
    {} as IRolePermissionService,
    {} as IUserPermissionService,
    {} as IProjectRoleService,
    projectGroups as unknown as IProjectGroupService,
    projectPermissions as unknown as IProjectPermissionService,
    {} as IProjectRolePermissionService,
    {} as IProjectUserPermissionService,
    projectResources as unknown as IProjectResourceService,
    {} as IUserRoleService,
    {} as IUserGroupService,
    {} as IProjectUserGroupService
  );
  return { builder, groupPermissions, projectPermissions, projectResources };
}

describe('CdmEntityBuilder batch pivots', () => {
  it('links group permissions and project pivots in one call each', async () => {
    const { builder, groupPermissions, projectPermissions, projectResources } = build();
    const perms = [perm('p1', 'r1'), perm('p2', 'r1'), perm('p3', 'r2')];

    const created = await builder.createDocumentGroup(
      projectId,
      'ops',
      'Ops',
      null,
      perms,
      null,
      tx
    );

    expect(groupPermissions.addGroupPermission).not.toHaveBeenCalled();
    expect(groupPermissions.addGroupPermissionsForCdmImport).toHaveBeenCalledTimes(1);
    expect(groupPermissions.addGroupPermissionsForCdmImport).toHaveBeenCalledWith(
      {
        links: [
          { groupId, permissionId: 'p1' },
          { groupId, permissionId: 'p2' },
          { groupId, permissionId: 'p3' },
        ],
      },
      tx
    );
    expect(projectPermissions.addProjectPermission).not.toHaveBeenCalled();
    expect(projectPermissions.addProjectPermissionsForCdmImport).toHaveBeenCalledTimes(1);
    expect(projectPermissions.addProjectPermissionsForCdmImport).toHaveBeenCalledWith(
      { projectId, permissionIds: ['p1', 'p2', 'p3'] },
      tx
    );
    expect(projectResources.addProjectResource).not.toHaveBeenCalled();
    expect(projectResources.addProjectResourcesForCdmImport).toHaveBeenCalledTimes(1);
    expect(projectResources.addProjectResourcesForCdmImport).toHaveBeenCalledWith(
      { projectId, resourceIds: ['r1', 'r2'] },
      tx
    );
    expect(created.groupPermissions).toBe(2);
    expect(created.projectPermissions).toBe(3);
    expect(created.projectResources).toBe(2);
  });

  it('reuses the in-TX project pivot set so a second group does not re-list', async () => {
    const { builder, projectPermissions, projectResources } = build();
    const first = [perm('p1', 'r1')];
    const second = [perm('p1', 'r1'), perm('p2', 'r2')];

    await builder.createDocumentGroup(projectId, 'a', 'A', null, first, null, tx);
    await builder.createDocumentGroup(projectId, 'b', 'B', null, second, null, tx);

    expect(projectPermissions.getProjectPermissions).toHaveBeenCalledTimes(1);
    expect(projectResources.getProjectResources).toHaveBeenCalledTimes(1);
    expect(projectPermissions.addProjectPermissionsForCdmImport).toHaveBeenNthCalledWith(
      2,
      { projectId, permissionIds: ['p2'] },
      tx
    );
    expect(projectResources.addProjectResourcesForCdmImport).toHaveBeenNthCalledWith(
      2,
      { projectId, resourceIds: ['r2'] },
      tx
    );
  });
});
