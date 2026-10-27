/**
 * The assignment step passes the user's externalKey to the membership write, so this
 * project's `cdmImport` marker lands on the row whether the provision step created the
 * identity or reused one.
 */
import type { CdmApplyContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserAssignmentCdmEntity } from '@/lib/cdm/entities/user-assignment.cdm-entity';

const projectId = '10000000-0000-4000-8000-000000000011';
const accountId = '20000000-0000-4000-8000-000000000020';
const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
const userId = '30000000-0000-4000-8000-000000000099';
const key = 'user@example.test';

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
  const handler = new UserAssignmentCdmEntity(
    {} as never,
    {} as never,
    projectUsers as never,
    userRoles as never,
    { addUserTag: vi.fn() } as never
  );
  const ctx = {
    projectId,
    scope,
    tx: { __tx: true },
    lookupResolvedRef: () => ({ id: 'p', resourceId: 'r' }),
    result: {
      warnings: [],
      projectUsersEnsured: 0,
      userRolesAssigned: 0,
    } as unknown as SyncProjectResult,
    produced: {
      roleIdsByKey: new Map([['viewer', 'role-1']]),
      tagIds: new Map(),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map([[key, userId]]),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map(),
    assignmentUserIds: new Set([userId]),
  } as unknown as CdmApplyContext;
  return { handler, projectUsers, ctx };
}

describe('UserAssignmentCdmEntity apply: membership marker', () => {
  it('passes the userKey as userExternalKey even with no metadata or searchable', async () => {
    const { handler, projectUsers, ctx } = build();
    await handler.apply(ctx, [{ userKey: key, roleTemplateKeys: ['viewer'] }]);
    expect(projectUsers.mergeProjectUserCdmMetadata).toHaveBeenCalledWith(
      { projectId, userId, importerMetadata: null, userExternalKey: key },
      ctx.tx
    );
  });

  it('passes the importer metadata and the key together', async () => {
    const { handler, projectUsers, ctx } = build();
    await handler.apply(ctx, [
      { userKey: key, roleTemplateKeys: ['viewer'], metadata: { legacyUserId: 'u-1' } },
    ]);
    const params = projectUsers.mergeProjectUserCdmMetadata.mock.calls[0][0];
    expect(params.userExternalKey).toBe(key);
    expect(params.importerMetadata).toEqual({ legacyUserId: 'u-1' });
  });

  it('derives the key from produced.userIds when the assignment names a user id', async () => {
    const { handler, projectUsers, ctx } = build();
    await handler.apply(ctx, [{ userId, roleTemplateKeys: ['viewer'] }]);
    expect(projectUsers.mergeProjectUserCdmMetadata.mock.calls[0][0].userExternalKey).toBe(key);
  });

  it('does not mark a user this import did not provision', async () => {
    const { handler, projectUsers, ctx } = build();
    (ctx.produced.userIds as Map<string, string>).clear();
    await handler.apply(ctx, [{ userId, roleTemplateKeys: ['viewer'] }]);
    expect(projectUsers.mergeProjectUserCdmMetadata).not.toHaveBeenCalled();
  });
});
