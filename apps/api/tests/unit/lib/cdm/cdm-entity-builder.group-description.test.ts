/**
 * An imported group without a description stores none: no generated "Imported group …" text in
 * the description or the search document. The import marker in the metadata already says where
 * the group came from.
 */
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
const tx = {} as never;

function setup() {
  const groups = {
    createGroup: vi.fn().mockResolvedValue({ id: 'group-1' }),
  };
  const roles = {
    createRole: vi.fn().mockResolvedValue({ id: 'role-1' }),
  };
  const noop = {} as never;
  const builder = new CdmEntityBuilder(
    {} as unknown as ProjectImportRepository,
    roles as unknown as IRoleService,
    groups as unknown as IGroupService,
    { addRoleGroup: vi.fn().mockResolvedValue(undefined) } as unknown as IRoleGroupService,
    {
      addGroupPermissionsForCdmImport: vi.fn().mockResolvedValue([]),
    } as unknown as IGroupPermissionService,
    noop as IRolePermissionService,
    noop as IUserPermissionService,
    { addProjectRole: vi.fn().mockResolvedValue(undefined) } as unknown as IProjectRoleService,
    { addProjectGroup: vi.fn().mockResolvedValue(undefined) } as unknown as IProjectGroupService,
    {
      getProjectPermissions: vi.fn().mockResolvedValue([]),
    } as unknown as IProjectPermissionService,
    noop as IProjectRolePermissionService,
    noop as IProjectUserPermissionService,
    {
      getProjectResources: vi.fn().mockResolvedValue([]),
    } as unknown as IProjectResourceService,
    noop as IUserRoleService,
    noop as IUserGroupService,
    noop as IProjectUserGroupService
  );
  return { builder, groups };
}

function createdGroup(groups: ReturnType<typeof setup>['groups']) {
  expect(groups.createGroup).toHaveBeenCalledTimes(1);
  return groups.createGroup.mock.calls[0]![0] as {
    description: string | null | undefined;
    searchDocument: string;
  };
}

describe('CdmEntityBuilder — imported group description', () => {
  it('stores no description for a document group that has none', async () => {
    const { builder, groups } = setup();

    await builder.createDocumentGroup(projectId, 'g-legacy-1', 'Support group', null, [], {}, tx);

    const input = createdGroup(groups);
    expect(input.description).toBeNull();
    expect(input.searchDocument).not.toMatch(/imported group/i);
  });

  it('keeps a document group description it is given', async () => {
    const { builder, groups } = setup();

    await builder.createDocumentGroup(
      projectId,
      'g-legacy-1',
      'Support group',
      'Handles claims',
      [],
      {},
      tx
    );

    expect(createdGroup(groups).description).toBe('Handles claims');
  });

  it("stores no description for a role template's group when neither the role nor the naming has one", async () => {
    const { builder, groups } = setup();

    await builder.createRoleWithGroup(
      projectId,
      scope,
      'role-key',
      'Role',
      null,
      'role',
      [],
      {},
      tx
    );

    const input = createdGroup(groups);
    expect(input.description).toBeNull();
    expect(input.searchDocument).not.toMatch(/imported group/i);
  });
});
