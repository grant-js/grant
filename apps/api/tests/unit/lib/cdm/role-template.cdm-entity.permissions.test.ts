/**
 * Role templates with no `permissionRefs` ("label roles") are valid: the role
 * is created with no permission links and exported back with an empty list.
 * Duplicate-key and tag-reference validation is unchanged.
 */
import type { CdmApplyContext, CdmExportContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { RoleTemplateCdmEntity } from '@/lib/cdm/entities/role-template.cdm-entity';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const roleId = '70000000-0000-4000-8000-000000000001';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };

function baseResult(): SyncProjectResult {
  return {
    projectId,
    importId: null,
    rolesCreated: 0,
    groupsCreated: 0,
    roleGroupsLinked: 0,
    groupPermissionsLinked: 0,
    projectRolesLinked: 0,
    projectGroupsLinked: 0,
    projectPermissionsLinked: 0,
    projectResourcesLinked: 0,
    projectUsersEnsured: 0,
    usersCreated: 0,
    userRolesAssigned: 0,
    projectUserApiKeysCreated: 0,
    passwordsImported: 0,
    passwordsUpdated: 0,
    passwordsUnchanged: 0,
    passwordsSkippedExisting: 0,
    tagsCreated: 0,
    projectTagsLinked: 0,
    roleTagsLinked: 0,
    groupTagsLinked: 0,
    userTagsLinked: 0,
    resourcesCreated: 0,
    permissionsCreated: 0,
    warnings: [],
  };
}

function buildHandler(exportRows: unknown[] = []) {
  const builder = {
    createRoleWithGroup: vi.fn(),
    createRoleWithDirectPermissions: vi.fn().mockResolvedValue({
      roleId,
      groupId: '',
      counts: {
        roleGroups: 0,
        groupPermissions: 0,
        rolePermissions: 0,
        userPermissions: 0,
        projectRoles: 1,
        projectGroups: 0,
        projectPermissions: 0,
        projectRolePermissions: 0,
        projectUserPermissions: 0,
        projectResources: 0,
      },
    }),
  };
  const exportRepo = {
    getProjectRolesWithPermissions: vi.fn().mockResolvedValue(exportRows),
    getRoleTagsByRoleIds: vi.fn().mockResolvedValue([]),
    getGroupTagsByGroupIds: vi.fn().mockResolvedValue([]),
    getCdmGroupIdsForRoleIds: vi.fn().mockResolvedValue(new Map()),
    getProjectTagDefinitions: vi.fn().mockResolvedValue([]),
    getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
    getGroupsByIds: vi.fn().mockResolvedValue([]),
    getGroupPermissionIdsByGroupIds: vi.fn().mockResolvedValue([]),
  };
  const handler = new RoleTemplateCdmEntity(
    {} as never,
    exportRepo as never,
    builder as never,
    { addRoleTag: vi.fn() } as never,
    { addGroupTag: vi.fn() } as never
  );
  return { handler, builder, exportRepo };
}

function applyCtx(lookupResolvedRef = vi.fn()): CdmApplyContext {
  return {
    projectId,
    scope,
    tx: { __tx: true },
    lookupResolvedRef,
    result: baseResult(),
    produced: {
      roleIdsByKey: new Map(),
      tagIds: new Map(),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map(),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map(),
    assignmentUserIds: new Set<string>(),
  };
}

const labelRole = {
  externalKey: 'alteosAdmin',
  name: 'alteosAdmin',
  description: null,
  metadata: null,
  permissionRefs: [],
};

describe('RoleTemplateCdmEntity — roles with no permissionRefs', () => {
  it('validateInput accepts a role template with empty permissionRefs', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([labelRole])).not.toThrow();
  });

  it('validateInput still rejects duplicate externalKeys', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([labelRole, { ...labelRole, name: 'other' }])).toThrow(
      /Duplicate role template externalKey: alteosAdmin/
    );
  });

  it('validateInput still rejects duplicate tagKeys and groupTagKeys', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([{ ...labelRole, tagKeys: ['t', 't'] }])).toThrow(
      /tagKeys: duplicate value 't'/
    );
    expect(() => handler.validateInput([{ ...labelRole, groupTagKeys: ['g', 'g'] }])).toThrow(
      /groupTagKeys: duplicate value 'g'/
    );
  });

  it('validateInput still requires primaryRoleTagKey / primaryGroupTagKey to appear in their key lists', () => {
    const { handler } = buildHandler();
    expect(() =>
      handler.validateInput([{ ...labelRole, tagKeys: ['a'], primaryRoleTagKey: 'b' }])
    ).toThrow(/primaryRoleTagKey must appear in tagKeys/);
    expect(() =>
      handler.validateInput([{ ...labelRole, groupTagKeys: ['a'], primaryGroupTagKey: 'b' }])
    ).toThrow(/primaryGroupTagKey must appear in groupTagKeys/);
  });

  it('collectPermissionRefs yields nothing for a label role', () => {
    const { handler } = buildHandler();
    expect(handler.collectPermissionRefs([labelRole])).toEqual([]);
  });

  it('apply creates the role with no permissions and no bindings', async () => {
    const { handler, builder } = buildHandler();
    const lookup = vi.fn();
    const ctx = applyCtx(lookup);

    await handler.apply(ctx, [labelRole]);

    expect(lookup).not.toHaveBeenCalled();
    expect(builder.createRoleWithGroup).not.toHaveBeenCalled();
    expect(builder.createRoleWithDirectPermissions).toHaveBeenCalledTimes(1);
    expect(builder.createRoleWithDirectPermissions.mock.calls[0]![6]).toEqual([]);
    expect(ctx.produced.roleIdsByKey.get('alteosAdmin')).toBe(roleId);
    expect(ctx.result.rolesCreated).toBe(1);
    expect(ctx.result.projectRolesLinked).toBe(1);
    expect(ctx.result.groupsCreated).toBe(0);
    expect(ctx.result.groupPermissionsLinked).toBe(0);
    expect(ctx.result.projectPermissionsLinked).toBe(0);
    expect(ctx.result.projectResourcesLinked).toBe(0);
  });

  it('export round-trips a role without permissions as permissionRefs: []', async () => {
    const { handler } = buildHandler([
      {
        roleId,
        name: 'CDM: alteosAdmin',
        description: null,
        permissions: [],
        metadata: {},
      },
    ]);

    const out = await handler.export({ projectId, scope } as CdmExportContext);

    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('alteosAdmin');
    expect(out[0]!.permissionRefs).toEqual([]);
    expect(out[0]!.linkedGrantGroup).toBeUndefined();
    expect(() => handler.validateInput(out)).not.toThrow();
  });
});
