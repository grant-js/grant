/**
 * The import side of the deletion tombstone, in `UserProvisionCdmEntity`: the skip rule at the
 * two create sites, and everything it must not block. Keys here include an address; the
 * sentinel test reads the result, the warnings and every error message.
 */
import type { CdmApplyContext } from '@grantjs/core';
import { type SyncProjectResult, Tenant, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fingerprintCdmExternalKey } from '@/lib/cdm/cdm-api-key-fingerprint.lib';
import { UserProvisionCdmEntity } from '@/lib/cdm/entities/user-provision.cdm-entity';
import { ValidationError } from '@/lib/errors';

const SECRET = 'unit-test-tombstone-secret';
const config = vi.hoisted(() => ({
  cdm: { apiKeyFingerprintHmacSecret: 'unit-test-tombstone-secret' },
}));
vi.mock('@/config', () => ({ config }));

const projectId = '10000000-0000-4000-8000-000000000011';
const tx = {};
const ADDRESS = 'sentinel.person@example.com';
const OTHER_ADDRESS = 'other.person@example.com';
const fp = (key: string) => fingerprintCdmExternalKey('user', key, SECRET);

const exportRepo = { getProjectCdmProvisionedUsers: vi.fn() };
const users = { createUser: vi.fn() };
const userAuthenticationMethods = {
  getUserAuthenticationMethodByEmail: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
};
const userRepository = { findUserIdByCdmImport: vi.fn(), findLiveUserCdmMarkers: vi.fn() };
const projectUsers = { filterMemberUserIds: vi.fn() };
const credentials = { importProjectPasswordHashes: vi.fn() };
const tombstones = { filterTombstoned: vi.fn(), insertIgnoringDuplicates: vi.fn() };

function createEntity(): UserProvisionCdmEntity {
  return new UserProvisionCdmEntity(
    exportRepo as never,
    users as never,
    userAuthenticationMethods as never,
    userRepository as never,
    projectUsers as never,
    credentials as never,
    tombstones as never
  );
}

function createCtx(): CdmApplyContext {
  const result: SyncProjectResult = {
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
    tagsCreated: 0,
    projectTagsLinked: 0,
    roleTagsLinked: 0,
    groupTagsLinked: 0,
    userTagsLinked: 0,
    resourcesCreated: 0,
    permissionsCreated: 0,
    warnings: [],
  };
  return {
    projectId,
    scope: { tenant: Tenant.AccountProject, id: `account-id:${projectId}` },
    tx,
    lookupResolvedRef: vi.fn(),
    result,
    produced: {
      roleIdsByKey: new Map(),
      tagIds: new Map(),
      resourceIds: new Map(),
      permissionIds: new Map(),
      userIds: new Map(),
      groupIdsByKey: new Map(),
    },
    documentGroupsByKey: new Map(),
    assignmentUserIds: new Set(),
    skippedUserKeys: new Set<string>(),
  } as CdmApplyContext;
}

const keyRow = (externalKey: string, extra: Record<string, unknown> = {}) => ({
  externalKey,
  findBy: 'key' as const,
  name: 'A',
  metadata: null,
  ...extra,
});
const emailRow = (externalKey: string, extra: Record<string, unknown> = {}) => ({
  externalKey,
  findBy: 'email' as const,
  name: 'A',
  metadata: null,
  ...extra,
});

const tombstonedKeys = (...keys: string[]) =>
  tombstones.filterTombstoned.mockResolvedValue(new Set(keys.map(fp)));

beforeEach(() => {
  vi.clearAllMocks();
  config.cdm.apiKeyFingerprintHmacSecret = SECRET;
  tombstones.filterTombstoned.mockResolvedValue(new Set());
  userRepository.findUserIdByCdmImport.mockResolvedValue(null);
  userRepository.findLiveUserCdmMarkers.mockResolvedValue({
    globalMarker: null,
    membershipMarker: null,
  });
  userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
  userAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({});
  users.createUser.mockResolvedValue({ id: 'new-user-id' });
});

describe('the tombstone read', () => {
  it('is one query per import, for this project and kind, with every document key fingerprinted', async () => {
    await createEntity().apply(createCtx(), [keyRow('k-1'), keyRow('k-2'), emailRow(ADDRESS)]);

    expect(tombstones.filterTombstoned).toHaveBeenCalledTimes(1);
    expect(tombstones.filterTombstoned).toHaveBeenCalledWith(
      { projectId, kind: 'user', fingerprints: [fp('k-1'), fp('k-2'), fp(ADDRESS)] },
      tx
    );
  });

  it('sends fingerprints, never a key, to the repository', async () => {
    await createEntity().apply(createCtx(), [emailRow(ADDRESS)]);

    expect(JSON.stringify(tombstones.filterTombstoned.mock.calls)).not.toContain('sentinel');
  });

  it('reads nothing and skips nothing without the fingerprint secret', async () => {
    config.cdm.apiKeyFingerprintHmacSecret = '';
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-1')]);

    expect(tombstones.filterTombstoned).not.toHaveBeenCalled();
    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });
});

describe('findBy: key, the first create site', () => {
  it('skips a tombstoned key: nothing created, nothing produced, the key recorded, one counted', async () => {
    tombstonedKeys('k-gone');
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-gone')]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.has('k-gone')).toBe(false);
    expect(ctx.assignmentUserIds.size).toBe(0);
    expect([...ctx.skippedUserKeys]).toEqual(['k-gone']);
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
    expect(ctx.result.usersCreated).toBe(0);
  });

  it('creates the rows around a skipped one as before', async () => {
    tombstonedKeys('k-gone');
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-before'), keyRow('k-gone'), keyRow('k-after')]);

    expect(users.createUser).toHaveBeenCalledTimes(2);
    expect(ctx.result.usersCreated).toBe(2);
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
    expect([...ctx.produced.userIds.keys()]).toEqual(['k-before', 'k-after']);
  });

  it('creates a key no tombstone covers', async () => {
    tombstonedKeys('some-other-key');
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-1')]);

    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
    expect(ctx.skippedUserKeys.size).toBe(0);
  });

  it('never blocks a key that resolves to a live identity, tombstone or not', async () => {
    tombstonedKeys('k-live');
    userRepository.findUserIdByCdmImport.mockResolvedValue('live-user-id');
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-live')]);

    expect(ctx.produced.userIds.get('k-live')).toBe('live-user-id');
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
    expect(ctx.skippedUserKeys.size).toBe(0);
  });

  it('never blocks a user matched by grantUserId, tombstone or not', async () => {
    tombstonedKeys('k-matched');
    const grantUserId = '30000000-0000-4000-8000-000000000001';
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-matched', { grantUserId })]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.get('k-matched')).toBe(grantUserId);
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });

  it('counts a skipped user once per document position, with no key in the result', async () => {
    tombstonedKeys('k-gone', 'k-gone-too');
    const ctx = createCtx();

    await createEntity().apply(ctx, [keyRow('k-gone'), keyRow('k-gone-too')]);

    expect(ctx.result.usersSkippedTombstoned).toBe(2);
    expect(ctx.result.warnings).toEqual([]);
  });
});

describe('findBy: email, the second create site', () => {
  it('skips a tombstoned address: no user, no method, the address recorded as skipped', async () => {
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(userAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.size).toBe(0);
    expect([...ctx.skippedUserKeys]).toEqual([ADDRESS]);
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
  });

  it('creates an address no tombstone covers', async () => {
    tombstonedKeys(OTHER_ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });

  it('never blocks a live e-mail identity, tombstone or not', async () => {
    tombstonedKeys(ADDRESS);
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'live-user-id',
      provider: UserAuthenticationMethodProvider.Email,
    });
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(userRepository.findLiveUserCdmMarkers).toHaveBeenCalledWith(
      { userId: 'live-user-id', projectId },
      tx
    );
    expect(ctx.produced.userIds.get(ADDRESS)).toBe('live-user-id');
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });

  it('never blocks a live marker match, tombstone or not', async () => {
    tombstonedKeys(ADDRESS);
    userRepository.findUserIdByCdmImport.mockResolvedValue('live-keyed-user-id');
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(ctx.produced.userIds.get(ADDRESS)).toBe('live-keyed-user-id');
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });
});

describe('liveness on the e-mail path: a method of a soft-deleted user is not a live identity', () => {
  const deletedOwnersMethod = (provider: UserAuthenticationMethodProvider) =>
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'deleted-user-id',
      provider,
    });

  beforeEach(() => {
    userRepository.findLiveUserCdmMarkers.mockResolvedValue(null);
  });

  it('is not reused: the deleted user is not attached to the project', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Email);
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(ctx.produced.userIds.has(ADDRESS)).toBe(false);
    expect(ctx.assignmentUserIds.has('deleted-user-id')).toBe(false);
  });

  it('skips the row when a tombstone covers the key (the self-deleted person comes back in a document)', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Email);
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect([...ctx.skippedUserKeys]).toEqual([ADDRESS]);
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('still resolves to a live user that carries the key, without adding a method for the taken address', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Email);
    userRepository.findUserIdByCdmImport.mockResolvedValue('live-keyed-user-id');
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(ctx.produced.userIds.get(ADDRESS)).toBe('live-keyed-user-id');
    expect(userAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(ctx.result.usersSkippedTombstoned).toBe(0);
  });

  it('refuses, naming the position and never the address, when nothing tombstones the key', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Email);
    const ctx = createCtx();

    const attempt = createEntity().apply(ctx, [emailRow(ADDRESS, { documentIndex: 4 })]);

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(attempt).rejects.toThrow(
      'users[4]: the e-mail identity belongs to a deleted account'
    );
    await attempt.catch((error: Error) => {
      expect(error.message).not.toContain('sentinel');
      expect(error.message).not.toContain('example.com');
    });
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('falls through to the normal create for a deleted user whose method is not an Email one', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Github);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(users.createUser).toHaveBeenCalledTimes(1);
    expect(ctx.result.usersCreated).toBe(1);
  });

  it('falls through to the skip for a deleted user whose method is not an Email one and a tombstone covers the key', async () => {
    deletedOwnersMethod(UserAuthenticationMethodProvider.Github);
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();

    await createEntity().apply(ctx, [emailRow(ADDRESS)]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
  });
});

describe('postApply drops the password of a skipped user', () => {
  const hash = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
  const memberId = '30000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    projectUsers.filterMemberUserIds.mockResolvedValue([memberId]);
    credentials.importProjectPasswordHashes.mockResolvedValue({
      imported: 1,
      updated: 0,
      unchanged: 0,
      skippedExisting: 0,
    });
  });

  it('does not treat it as a non-member, and still imports the others', async () => {
    const ctx = createCtx();
    ctx.skippedUserKeys.add(ADDRESS);
    ctx.produced.userIds.set(OTHER_ADDRESS, memberId);
    const password = { algorithm: 'bcrypt' as const, hash };

    await createEntity().postApply(ctx, [
      emailRow(ADDRESS, { password, documentIndex: 0 }),
      emailRow(OTHER_ADDRESS, { password, documentIndex: 1 }),
    ]);

    expect(credentials.importProjectPasswordHashes).toHaveBeenCalledWith(
      { projectId, rows: [{ userId: memberId, hash }] },
      tx
    );
  });

  it('writes nothing, reads nothing and does not fail when every password belongs to a skipped user', async () => {
    const ctx = createCtx();
    ctx.skippedUserKeys.add(ADDRESS);

    await createEntity().postApply(ctx, [
      emailRow(ADDRESS, { password: { algorithm: 'bcrypt' as const, hash } }),
    ]);

    expect(projectUsers.filterMemberUserIds).not.toHaveBeenCalled();
    expect(credentials.importProjectPasswordHashes).not.toHaveBeenCalled();
  });
});

describe('sentinel: a skipped key leaves no trace beyond the counter and the skipped set', () => {
  it('keeps the address out of the result, its warnings and every thrown message', async () => {
    tombstonedKeys(ADDRESS);
    const ctx = createCtx();
    await createEntity().apply(ctx, [emailRow(ADDRESS), keyRow('plain-key')]);

    expect(JSON.stringify(ctx.result)).not.toContain('sentinel');
    expect(JSON.stringify(ctx.result)).not.toContain('plain-key');
    expect(ctx.result.warnings).toEqual([]);
    expect(ctx.result.usersSkippedTombstoned).toBe(1);
  });
});
