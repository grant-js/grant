import type { CdmApplyContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserAssignmentCdmEntity } from '@/lib/cdm/entities/user-assignment.cdm-entity';
import { ValidationError } from '@/lib/errors';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const userId = '30000000-0000-4000-8000-000000000099';
const otherUserId = '30000000-0000-4000-8000-000000000098';
const viewerRoleId = '40000000-0000-4000-8000-000000000044';
const editorRoleId = '40000000-0000-4000-8000-000000000045';

function build() {
  const projectUsers = {
    addProjectUser: vi.fn().mockResolvedValue(undefined),
    mergeProjectUserCdmMetadata: vi.fn().mockResolvedValue(undefined),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };
  const userRoles = {
    addUserRole: vi.fn().mockResolvedValue(undefined),
    addUserRolesForCdmImport: vi.fn().mockResolvedValue([]),
  };
  const builder = {
    createDocumentGroup: vi.fn().mockResolvedValue({
      groupId: '50000000-0000-4000-8000-000000000055',
      groupPermissions: 1,
      projectGroups: 1,
      projectPermissions: 0,
      projectResources: 0,
    }),
    linkDirectGroupsToUser: vi.fn().mockResolvedValue({
      projectGroups: 0,
      projectPermissions: 0,
      projectResources: 0,
    }),
  };
  const handler = new UserAssignmentCdmEntity(
    {} as never,
    builder as never,
    projectUsers as never,
    userRoles as never,
    { addUserTag: vi.fn() } as never
  );
  const result = {
    warnings: [],
    projectUsersEnsured: 0,
    userRolesAssigned: 0,
    groupsCreated: 0,
    groupPermissionsLinked: 0,
    projectGroupsLinked: 0,
    projectPermissionsLinked: 0,
    projectResourcesLinked: 0,
  } as unknown as SyncProjectResult;
  const ctx = {
    projectId,
    scope,
    tx: { __tx: true },
    lookupResolvedRef: () => ({ id: 'p', resourceId: 'r' }),
    result,
    produced: {
      roleIdsByKey: new Map([
        ['viewer', viewerRoleId],
        ['editor', editorRoleId],
      ]),
      tagIds: new Map(),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map([
        ['user@example.test', userId],
        ['other@example.test', otherUserId],
      ]),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map([
      ['ops', { name: 'Ops', description: null, metadata: null, searchable: null }],
    ]),
    assignmentUserIds: new Set([userId, otherUserId]),
  } as unknown as CdmApplyContext;
  return { handler, userRoles, builder, ctx, result };
}

describe('UserAssignmentCdmEntity apply: batch role listings', () => {
  it('increments userRolesAssigned per listing and writes unique pairs once', async () => {
    const { handler, userRoles, ctx, result } = build();

    await handler.apply(ctx, [
      {
        userKey: 'user@example.test',
        roleTemplateKeys: ['viewer', 'viewer', 'editor', 'viewer'],
      },
    ]);

    expect(result.userRolesAssigned).toBe(4);
    expect(userRoles.addUserRole).not.toHaveBeenCalled();
    expect(userRoles.addUserRolesForCdmImport).toHaveBeenCalledTimes(1);
    expect(userRoles.addUserRolesForCdmImport).toHaveBeenCalledWith(
      {
        assignments: [
          { userId, roleId: viewerRoleId },
          { userId, roleId: viewerRoleId },
          { userId, roleId: editorRoleId },
          { userId, roleId: viewerRoleId },
        ],
      },
      ctx.tx
    );
  });

  it('does not write roles when a later listing is unknown, so the envelope can roll back', async () => {
    const { handler, userRoles, builder, ctx } = build();

    await expect(
      handler.apply(ctx, [
        {
          userKey: 'user@example.test',
          roleTemplateKeys: ['viewer'],
          directGroups: [{ groupKey: 'ops', permissionRefs: [] }],
        },
        {
          userKey: 'other@example.test',
          roleTemplateKeys: ['missing'],
        },
      ])
    ).rejects.toBeInstanceOf(ValidationError);

    expect(builder.createDocumentGroup).toHaveBeenCalledTimes(1);
    expect(userRoles.addUserRolesForCdmImport).not.toHaveBeenCalled();
    expect(userRoles.addUserRole).not.toHaveBeenCalled();
  });
});
