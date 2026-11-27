/**
 * A document group that only users reference (`users[].groups`, no role lists it) is created
 * by the user-assignment handler. Its `tags` and `primaryTag` must be linked as `group_tags`,
 * exactly as they are for a group a role template links.
 */
import type { CdmApplyContext } from '@grantjs/core';
import type { GroupCdmInput } from '@grantjs/schema';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import type { CdmUserAssignmentInternal } from '@/lib/cdm/cdm-internal.types';
import { UserAssignmentCdmEntity } from '@/lib/cdm/entities/user-assignment.cdm-entity';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const userA = '30000000-0000-4000-8000-0000000000aa';
const userB = '30000000-0000-4000-8000-0000000000bb';
const groupId = '40000000-0000-4000-8000-000000000001';
const partnerTagId = '60000000-0000-4000-8000-000000000aaa';
const resourceTagId = '60000000-0000-4000-8000-000000000bbb';

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
    projectUserApiKeysUnchanged: 0,
    projectUserApiKeysRotated: 0,
    projectUserApiKeysDeleted: 0,
    passwordsImported: 0,
    passwordsUpdated: 0,
    passwordsUnchanged: 0,
    passwordsSkippedExisting: 0,
    usersSkippedTombstoned: 0,
    usersRenamed: 0,
    projectDisplayNamesUpdated: 0,
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

function setup(documentGroup: GroupCdmInput) {
  const builder = {
    createDocumentGroup: vi.fn().mockResolvedValue({
      groupId,
      groupPermissions: 0,
      projectGroups: 1,
      projectPermissions: 0,
      projectResources: 0,
    }),
    linkDirectGroupsToUser: vi
      .fn()
      .mockResolvedValue({ projectGroups: 0, projectPermissions: 0, projectResources: 0 }),
  };
  const projectUsers = {
    addProjectUser: vi.fn().mockResolvedValue(undefined),
    mergeProjectUserCdmMetadata: vi.fn().mockResolvedValue(undefined),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };
  const userRoles = {
    addUserRole: vi.fn(),
    addUserRolesForCdmImport: vi.fn().mockResolvedValue([]),
  };
  const groupTags = { addGroupTag: vi.fn().mockResolvedValue(undefined) };
  const handler = new UserAssignmentCdmEntity(
    {} as never,
    builder as never,
    projectUsers as never,
    userRoles as never,
    { addUserTag: vi.fn() } as never,
    groupTags as never
  );
  const ctx: CdmApplyContext = {
    projectId,
    scope,
    tx: { __tx: true },
    lookupResolvedRef: () => ({ id: 'p', resourceId: 'r' }),
    result: baseResult(),
    produced: {
      roleIdsByKey: new Map(),
      tagIds: new Map([
        ['tag:partner:p1', partnerTagId],
        ['tag:resource:policies', resourceTagId],
      ]),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map(),
      userNamesByKey: new Map<string, string>(),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map([[documentGroup.key, documentGroup]]),
    assignmentUserIds: new Set([userA, userB]),
    skippedUserKeys: new Set<string>(),
  };
  return { handler, ctx, builder, groupTags };
}

function memberOf(userId: string, groupKey: string): CdmUserAssignmentInternal {
  return {
    userId,
    directGroupKeys: [groupKey],
    directGroups: [{ groupKey, permissionRefs: [] }],
  };
}

describe('UserAssignmentCdmEntity — tags of a directly assigned document group', () => {
  it('links the group tags once, with the primary tag marked', async () => {
    const { handler, ctx, builder, groupTags } = setup({
      key: 'g1',
      name: 'Partner API user group',
      tags: ['tag:partner:p1', 'tag:resource:policies'],
      primaryTag: 'tag:partner:p1',
    });

    await handler.apply(ctx, [memberOf(userA, 'g1'), memberOf(userB, 'g1')]);

    expect(builder.createDocumentGroup).toHaveBeenCalledTimes(1);
    expect(groupTags.addGroupTag).toHaveBeenCalledTimes(2);
    expect(groupTags.addGroupTag).toHaveBeenCalledWith(
      { groupId, tagId: partnerTagId, isPrimary: true },
      ctx.tx
    );
    expect(groupTags.addGroupTag).toHaveBeenCalledWith(
      { groupId, tagId: resourceTagId, isPrimary: false },
      ctx.tx
    );
    expect(ctx.result.groupTagsLinked).toBe(2);
  });

  it('links a tag listed twice only once', async () => {
    const { handler, ctx, groupTags } = setup({
      key: 'g1',
      name: 'Group',
      tags: ['tag:partner:p1', 'tag:partner:p1'],
    });

    await handler.apply(ctx, [memberOf(userA, 'g1')]);

    expect(groupTags.addGroupTag).toHaveBeenCalledTimes(1);
    expect(groupTags.addGroupTag).toHaveBeenCalledWith(
      { groupId, tagId: partnerTagId, isPrimary: false },
      ctx.tx
    );
  });

  it('links nothing for a group without tags', async () => {
    const { handler, ctx, groupTags } = setup({ key: 'g1', name: 'Group' });

    await handler.apply(ctx, [memberOf(userA, 'g1')]);

    expect(groupTags.addGroupTag).not.toHaveBeenCalled();
    expect(ctx.result.groupTagsLinked).toBe(0);
  });

  it('rejects a group tag that is not in the tags section', async () => {
    const { handler, ctx } = setup({ key: 'g1', name: 'Group', tags: ['tag:partner:unknown'] });

    await expect(handler.apply(ctx, [memberOf(userA, 'g1')])).rejects.toThrow(
      /groups\[g1\]: unknown tagKey 'tag:partner:unknown'; must appear in the tags section/
    );
  });
});
