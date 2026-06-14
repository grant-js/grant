/**
 * Focused unit tests for the tag-wiring slice of the UserAssignmentCdmEntity.
 *
 * Asserts that:
 *   - apply() resolves `tagKeys` against `produced.tagIds` and writes user_tags,
 *     bumping the userTagsLinked counter.
 *   - apply() throws `ValidationError` for an unknown tagKey.
 *   - export() projects user_tags back to the CDM input shape.
 */
import type { CdmApplyContext, CdmExportContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserAssignmentCdmEntity } from '@/lib/cdm/entities/user-assignment.cdm-entity';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const userId = '30000000-0000-4000-8000-000000000099';

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

function buildHandler(deps?: {
  exportRepo?: {
    getProjectUsersWithRoleIds: ReturnType<typeof vi.fn>;
    getUserTagsByUserIds: ReturnType<typeof vi.fn>;
    getProjectRolesWithPermissions: ReturnType<typeof vi.fn>;
    getProjectTagDefinitions: ReturnType<typeof vi.fn>;
    getProjectCdmProvisionedUsers: ReturnType<typeof vi.fn>;
    getProjectLinkedPermissionsForExport?: ReturnType<typeof vi.fn>;
    getProjectUserDirectPermissions?: ReturnType<typeof vi.fn>;
    getProjectUserDirectGroups?: ReturnType<typeof vi.fn>;
    getGroupsByIds?: ReturnType<typeof vi.fn>;
    getGroupPermissionIdsByGroupIds?: ReturnType<typeof vi.fn>;
    getGroupTagsByGroupIds?: ReturnType<typeof vi.fn>;
  };
  projectUsers?: {
    addProjectUser: ReturnType<typeof vi.fn>;
    mergeProjectUserCdmMetadata: ReturnType<typeof vi.fn>;
  };
  userRoles?: { addUserRole: ReturnType<typeof vi.fn> };
  userTags?: { addUserTag: ReturnType<typeof vi.fn> };
}) {
  const exportRepo = deps?.exportRepo ?? {
    getProjectUsersWithRoleIds: vi.fn().mockResolvedValue([]),
    getUserTagsByUserIds: vi.fn().mockResolvedValue([]),
    getProjectRolesWithPermissions: vi.fn().mockResolvedValue([]),
    getProjectTagDefinitions: vi.fn().mockResolvedValue([]),
    getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
    getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
    getProjectUserDirectPermissions: vi.fn().mockResolvedValue([]),
    getProjectUserDirectGroups: vi.fn().mockResolvedValue([]),
    getGroupsByIds: vi.fn().mockResolvedValue([]),
    getGroupPermissionIdsByGroupIds: vi.fn().mockResolvedValue([]),
    getGroupTagsByGroupIds: vi.fn().mockResolvedValue([]),
  };
  const projectUsers = deps?.projectUsers ?? {
    addProjectUser: vi.fn().mockResolvedValue(undefined),
    mergeProjectUserCdmMetadata: vi.fn().mockResolvedValue(undefined),
  };
  const userRoles = deps?.userRoles ?? { addUserRole: vi.fn().mockResolvedValue(undefined) };
  const userTags = deps?.userTags ?? { addUserTag: vi.fn().mockResolvedValue(undefined) };
  const builder = { createRoleWithGroup: vi.fn() };
  return {
    handler: new UserAssignmentCdmEntity(
      exportRepo as never,
      builder as never,
      projectUsers as never,
      userRoles as never,
      userTags as never
    ),
    exportRepo,
    projectUsers,
    userRoles,
    userTags,
  };
}

describe('UserAssignmentCdmEntity — tag wiring', () => {
  it('validateInput rejects duplicate tagKeys for the same user', () => {
    const { handler } = buildHandler();
    expect(() => handler.validateInput([{ userId, tagKeys: ['t', 't'] }])).toThrow(
      /tagKeys: duplicate value 't'/
    );
  });

  it('apply attaches user_tags from produced.tagIds and bumps userTagsLinked', async () => {
    const { handler, userTags } = buildHandler();
    const result = baseResult();
    const tagIds = new Map<string, string>([
      ['t1', '60000000-0000-4000-8000-000000000aaa'],
      ['t2', '60000000-0000-4000-8000-000000000bbb'],
    ]);
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: { __tx: true },
      lookupResolvedRef: () => ({ id: 'p', resourceId: 'r' }),
      result,
      produced: {
        roleIdsByKey: new Map([['viewer', 'role-1']]),
        tagIds,
        resourceIds: new Map(),
        permissionIds: new Map(),
        userIds: new Map(),
        groupIdsByKey: new Map(),
      },
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set([userId]),
    };

    await handler.apply(ctx, [{ userId, roleTemplateKeys: ['viewer'], tagKeys: ['t1', 't2'] }]);

    expect(userTags.addUserTag).toHaveBeenCalledTimes(2);
    expect(userTags.addUserTag).toHaveBeenNthCalledWith(
      1,
      { userId, tagId: tagIds.get('t1'), isPrimary: false },
      ctx.tx
    );
    expect(userTags.addUserTag).toHaveBeenNthCalledWith(
      2,
      { userId, tagId: tagIds.get('t2'), isPrimary: false },
      ctx.tx
    );
    expect(result.userTagsLinked).toBe(2);
  });

  it('apply throws ValidationError for unknown tagKey', async () => {
    const { handler } = buildHandler();
    const ctx: CdmApplyContext = {
      projectId,
      scope,
      tx: { __tx: true },
      lookupResolvedRef: () => ({ id: 'p', resourceId: 'r' }),
      result: baseResult(),
      produced: {
        roleIdsByKey: new Map([['viewer', 'role-1']]),
        tagIds: new Map(),
        resourceIds: new Map(),
        permissionIds: new Map(),
        userIds: new Map(),
        groupIdsByKey: new Map(),
      },
      documentGroupsByKey: new Map(),
      assignmentUserIds: new Set([userId]),
    };

    await expect(
      handler.apply(ctx, [{ userId, roleTemplateKeys: ['viewer'], tagKeys: ['nope'] }])
    ).rejects.toThrow(/unknown tagKey 'nope'/);
  });

  it('export projects user_tags as opaque tagKeys (sorted) and uses opaque role keys', async () => {
    const tagA = '60000000-0000-4000-8000-000000000aaa';
    const tagB = '60000000-0000-4000-8000-000000000bbb';
    const roleId = '70000000-0000-4000-8000-000000000777';
    const { handler } = buildHandler({
      exportRepo: {
        getProjectUsersWithRoleIds: vi
          .fn()
          .mockResolvedValue([{ userId, roleIds: [roleId], metadata: {} }]),
        getUserTagsByUserIds: vi.fn().mockResolvedValue([
          { ownerId: userId, tagId: tagB },
          { ownerId: userId, tagId: tagA },
        ]),
        getProjectRolesWithPermissions: vi
          .fn()
          .mockResolvedValue([
            { roleId, name: 'CDM: Viewer', description: null, permissions: [], metadata: {} },
          ]),
        getProjectTagDefinitions: vi.fn().mockResolvedValue([
          { tagId: tagA, name: 'Alpha', color: '#fff', isPrimary: false, metadata: {} },
          { tagId: tagB, name: 'Beta', color: '#000', isPrimary: false, metadata: {} },
        ]),
        getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
        getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
        getProjectUserDirectPermissions: vi.fn().mockResolvedValue([]),
        getProjectUserDirectGroups: vi.fn().mockResolvedValue([]),
        getGroupsByIds: vi.fn().mockResolvedValue([]),
        getGroupPermissionIdsByGroupIds: vi.fn().mockResolvedValue([]),
        getGroupTagsByGroupIds: vi.fn().mockResolvedValue([]),
      },
    });

    const ctx: CdmExportContext = { projectId, scope };
    const out = await handler.export(ctx);

    expect(out).toHaveLength(1);
    expect(out[0].userId).toBe(userId);
    expect(out[0].roleTemplateKeys).toHaveLength(1);
    expect(out[0].roleTemplateKeys?.[0]).toMatch(/^cdm-role-[a-f0-9]{16}$/);
    expect(out[0].roleTemplateKeys?.[0]).not.toBe(roleId);
    expect(out[0].tagKeys).toHaveLength(2);
    for (const k of out[0].tagKeys ?? []) {
      expect(k).toMatch(/^cdm-tag-[a-f0-9]{16}$/);
    }
  });

  it('export omits tagKeys when user has no user_tags', async () => {
    const roleId = '70000000-0000-4000-8000-000000000777';
    const { handler } = buildHandler({
      exportRepo: {
        getProjectUsersWithRoleIds: vi
          .fn()
          .mockResolvedValue([{ userId, roleIds: [roleId], metadata: {} }]),
        getUserTagsByUserIds: vi.fn().mockResolvedValue([]),
        getProjectRolesWithPermissions: vi
          .fn()
          .mockResolvedValue([
            { roleId, name: 'Viewer', description: null, permissions: [], metadata: {} },
          ]),
        getProjectTagDefinitions: vi.fn().mockResolvedValue([]),
        getProjectCdmProvisionedUsers: vi.fn().mockResolvedValue([]),
        getProjectLinkedPermissionsForExport: vi.fn().mockResolvedValue([]),
        getProjectUserDirectPermissions: vi.fn().mockResolvedValue([]),
        getProjectUserDirectGroups: vi.fn().mockResolvedValue([]),
        getGroupsByIds: vi.fn().mockResolvedValue([]),
        getGroupPermissionIdsByGroupIds: vi.fn().mockResolvedValue([]),
        getGroupTagsByGroupIds: vi.fn().mockResolvedValue([]),
      },
    });

    const out = await handler.export({ projectId, scope });

    expect(out[0].tagKeys).toBeUndefined();
  });
});
