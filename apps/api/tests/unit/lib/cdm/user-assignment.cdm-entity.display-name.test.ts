/**
 * The assignment step sets this project's name for the person (`project_users.display_name`)
 * to the document's name through the one profile-update path, counts it, and leaves the global
 * user alone.
 */
import type { CdmApplyContext } from '@grantjs/core';
import { Scope, SyncProjectResult, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { UserAssignmentCdmEntity } from '@/lib/cdm/entities/user-assignment.cdm-entity';

const accountId = '20000000-0000-4000-8000-000000000020';
const userId = '30000000-0000-4000-8000-000000000099';
const key = 'user@example.test';

/** Shared store of memberships, keyed `projectId:userId`, as the database would be. */
function buildStore(initial: Record<string, string | null> = {}) {
  const store = new Map<string, string | null>(Object.entries(initial));
  const projectUsers = {
    addProjectUser: vi.fn().mockResolvedValue(undefined),
    mergeProjectUserCdmMetadata: vi.fn().mockResolvedValue(undefined),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
    getProjectUsers: vi.fn(async ({ projectId, userId: uid }) => [
      { projectId, userId: uid, displayName: store.get(`${projectId}:${uid}`) ?? null },
    ]),
    updateProjectUserProfile: vi.fn(async ({ projectId, userId: uid, displayName }) => {
      store.set(`${projectId}:${uid}`, displayName);
    }),
  };
  return { store, projectUsers };
}

function build(
  projectUsers: ReturnType<typeof buildStore>['projectUsers'],
  projectId: string,
  names: Record<string, string>
) {
  const scope: Scope = { tenant: Tenant.AccountProject, id: `${accountId}:${projectId}` };
  const globalUsers = { updateUser: vi.fn() };
  const handler = new UserAssignmentCdmEntity(
    {} as never,
    {} as never,
    projectUsers as never,
    { addUserRole: vi.fn(), addUserRolesForCdmImport: vi.fn().mockResolvedValue([]) } as never,
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
      projectDisplayNamesUpdated: 0,
    } as unknown as SyncProjectResult,
    produced: {
      roleIdsByKey: new Map([['viewer', 'role-1']]),
      tagIds: new Map(),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map([[key, userId]]),
      userNamesByKey: new Map(Object.entries(names)),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map(),
    assignmentUserIds: new Set([userId]),
    skippedUserKeys: new Set<string>(),
  } as unknown as CdmApplyContext;
  return { handler, ctx, globalUsers };
}

const assignment = [{ userKey: key, roleTemplateKeys: ['viewer'] }];

describe('UserAssignmentCdmEntity apply: project display name', () => {
  it('sets the display name of a user with none (a created user), and counts it', async () => {
    const { projectUsers, store } = buildStore();
    const { handler, ctx } = build(projectUsers, 'p1', { [key]: 'Ada Lovelace' });
    await handler.apply(ctx, assignment);
    expect(projectUsers.updateProjectUserProfile).toHaveBeenCalledWith(
      { projectId: 'p1', userId, displayName: 'Ada Lovelace' },
      ctx.tx
    );
    expect(store.get(`p1:${userId}`)).toBe('Ada Lovelace');
    expect(ctx.result.projectDisplayNamesUpdated).toBe(1);
  });

  it('writes nothing and counts nothing when the display name is unchanged', async () => {
    const { projectUsers } = buildStore({ [`p1:${userId}`]: 'Ada Lovelace' });
    const { handler, ctx } = build(projectUsers, 'p1', { [key]: 'Ada Lovelace' });
    await handler.apply(ctx, assignment);
    expect(projectUsers.updateProjectUserProfile).not.toHaveBeenCalled();
    expect(ctx.result.projectDisplayNamesUpdated).toBe(0);
    // No write, so the import's own search sync still runs, once.
    expect(projectUsers.syncProjectUserSearchDocument).toHaveBeenCalledTimes(1);
  });

  it('rebuilds the search document once: the profile write replaces the import sync', async () => {
    const { projectUsers } = buildStore({ [`p1:${userId}`]: 'Old' });
    const { handler, ctx } = build(projectUsers, 'p1', { [key]: 'New' });
    await handler.apply(ctx, assignment);
    expect(projectUsers.updateProjectUserProfile).toHaveBeenCalledTimes(1);
    expect(projectUsers.syncProjectUserSearchDocument).not.toHaveBeenCalled();
  });

  it("gives a reused, shared user this project's name and never touches the global user", async () => {
    // The membership shows another project's name; this project's membership has none yet.
    const { projectUsers, store } = buildStore({ [`other:${userId}`]: 'Other Name' });
    const { handler, ctx, globalUsers } = build(projectUsers, 'p1', { [key]: 'Our Name' });
    await handler.apply(ctx, assignment);
    expect(store.get(`p1:${userId}`)).toBe('Our Name');
    expect(store.get(`other:${userId}`)).toBe('Other Name');
    expect(globalUsers.updateUser).not.toHaveBeenCalled();
    for (const [params] of projectUsers.updateProjectUserProfile.mock.calls) {
      expect(Object.keys(params).sort()).toEqual(['displayName', 'projectId', 'userId']);
    }
  });

  it('writes a blank name as null, never an empty string', async () => {
    const { projectUsers, store } = buildStore({ [`p1:${userId}`]: 'Old' });
    const { handler, ctx } = build(projectUsers, 'p1', { [key]: '   ' });
    await handler.apply(ctx, assignment);
    expect(projectUsers.updateProjectUserProfile).toHaveBeenCalledWith(
      { projectId: 'p1', userId, displayName: null },
      ctx.tx
    );
    expect(store.get(`p1:${userId}`)).toBeNull();
  });

  it('keeps different names for the same user in two projects', async () => {
    const { projectUsers, store } = buildStore();
    const one = build(projectUsers, 'p1', { [key]: 'Name in one' });
    const two = build(projectUsers, 'p2', { [key]: 'Name in two' });
    await one.handler.apply(one.ctx, assignment);
    await two.handler.apply(two.ctx, assignment);
    expect(store.get(`p1:${userId}`)).toBe('Name in one');
    expect(store.get(`p2:${userId}`)).toBe('Name in two');
    expect(one.ctx.result.projectDisplayNamesUpdated).toBe(1);
    expect(two.ctx.result.projectDisplayNamesUpdated).toBe(1);
  });

  it('leaves a user with no name from this document alone', async () => {
    const { projectUsers } = buildStore();
    const { handler, ctx } = build(projectUsers, 'p1', {});
    await handler.apply(ctx, assignment);
    expect(projectUsers.getProjectUsers).not.toHaveBeenCalled();
    expect(projectUsers.updateProjectUserProfile).not.toHaveBeenCalled();
  });
});
