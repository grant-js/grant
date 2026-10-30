import type { CdmApplyContext } from '@grantjs/core';
import { type SyncProjectResult, Tenant, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserProvisionCdmEntity } from '@/lib/cdm/entities/user-provision.cdm-entity';
import { ValidationError } from '@/lib/errors';

const projectId = '10000000-0000-4000-8000-000000000011';
const tx = {};

const exportRepo = {
  getProjectCdmProvisionedUsers: vi.fn(),
};
const users = {
  createUser: vi.fn(),
};
const userAuthenticationMethods = {
  getUserAuthenticationMethodByEmail: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
};
const userRepository = {
  findUserIdByCdmImport: vi.fn(),
  findLiveUserCdmMarkers: vi.fn(),
};
const projectUsers = {
  filterMemberUserIds: vi.fn(),
};
const credentials = {
  importProjectPasswordHashes: vi.fn(),
};

function createEntity(): UserProvisionCdmEntity {
  return new UserProvisionCdmEntity(
    exportRepo as never,
    users as never,
    userAuthenticationMethods as never,
    userRepository as never,
    projectUsers as never,
    credentials as never
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
  } as CdmApplyContext;
}

describe('UserProvisionCdmEntity email identities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
    userAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({});
    userRepository.findUserIdByCdmImport.mockResolvedValue(null);
    users.createUser.mockResolvedValue({ id: 'new-user-id' });
  });

  it('creates a global user plus unverified email authentication method for a new email identity', async () => {
    const entity = createEntity();
    const ctx = createCtx();

    await entity.apply(ctx, [
      {
        externalKey: 'new@example.com',
        findBy: 'email',
        name: 'New User',
        metadata: null,
      },
    ]);

    expect(users.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New User' }),
      tx
    );
    expect(userAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
      {
        userId: 'new-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        providerId: 'new@example.com',
        providerData: {},
        isVerified: false,
      },
      tx
    );
    expect(ctx.produced.userIds.get('new@example.com')).toBe('new-user-id');
    expect(ctx.assignmentUserIds.has('new-user-id')).toBe(true);
    expect(ctx.result.usersCreated).toBe(1);
  });

  it('reuses an existing email authentication method without creating a user', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'existing-user-id',
      provider: UserAuthenticationMethodProvider.Email,
    });
    const entity = createEntity();
    const ctx = createCtx();

    await entity.apply(ctx, [
      {
        externalKey: 'existing@example.com',
        findBy: 'email',
        name: 'Existing User',
        metadata: null,
      },
    ]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(userAuthenticationMethods.createUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.get('existing@example.com')).toBe('existing-user-id');
    expect(ctx.assignmentUserIds.has('existing-user-id')).toBe(true);
  });

  it('adds an unverified email method when the global identity is found by GitHub email', async () => {
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue({
      userId: 'github-user-id',
      provider: UserAuthenticationMethodProvider.Github,
    });
    const entity = createEntity();
    const ctx = createCtx();

    await entity.apply(ctx, [
      {
        externalKey: 'github@example.com',
        findBy: 'email',
        name: 'GitHub User',
        metadata: null,
      },
    ]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(userAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
      {
        userId: 'github-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        providerId: 'github@example.com',
        providerData: {},
        isVerified: false,
      },
      tx
    );
    expect(ctx.produced.userIds.get('github@example.com')).toBe('github-user-id');
  });

  it('links a prior CDM-provisioned user and creates the missing email method', async () => {
    userRepository.findUserIdByCdmImport.mockResolvedValue('cdm-user-id');
    const entity = createEntity();
    const ctx = createCtx();

    await entity.apply(ctx, [
      {
        externalKey: 'legacy@example.com',
        findBy: 'email',
        name: 'Legacy User',
        metadata: null,
      },
    ]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(userAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
      {
        userId: 'cdm-user-id',
        provider: UserAuthenticationMethodProvider.Email,
        providerId: 'legacy@example.com',
        providerData: {},
        isVerified: false,
      },
      tx
    );
    expect(ctx.produced.userIds.get('legacy@example.com')).toBe('cdm-user-id');
  });

  it('rejects duplicate normalized email identities', () => {
    const entity = createEntity();

    expect(() =>
      entity.validateInput([
        { externalKey: 'dup@example.com', findBy: 'email', name: 'A' },
        { externalKey: 'dup@example.com', findBy: 'email', name: 'B' },
      ])
    ).toThrow(ValidationError);
  });

  it('rejects invalid email identities', () => {
    const entity = createEntity();

    expect(() =>
      entity.validateInput([{ externalKey: 'not-an-email', findBy: 'email', name: 'A' }])
    ).toThrow(ValidationError);
  });
});

describe('UserProvisionCdmEntity password validation', () => {
  const hash = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

  it('accepts a bcrypt credential on an email identity', () => {
    expect(() =>
      createEntity().validateInput([
        {
          externalKey: 'a@example.com',
          findBy: 'email',
          name: 'A',
          password: { algorithm: 'bcrypt', hash },
        },
      ])
    ).not.toThrow();
  });

  it('refuses a credential on a key-identified user without naming the key or the hash', () => {
    let message = '';
    try {
      createEntity().validateInput([
        {
          externalKey: 'legacy-user-17',
          findBy: 'key',
          name: 'A',
          password: { algorithm: 'bcrypt', hash },
        },
      ]);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/password is only allowed with key.findBy 'email'/);
    expect(message).not.toContain(hash);
    expect(message).not.toContain('legacy-user-17');
  });

  it('refuses a malformed hash without echoing it', () => {
    const bad = `${hash}extra`;
    let message = '';
    try {
      createEntity().validateInput([
        {
          externalKey: 'a@example.com',
          findBy: 'email',
          name: 'A',
          password: { algorithm: 'bcrypt', hash: bad },
        },
      ]);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('password.hash');
    expect(message).not.toContain(bad);
    expect(message).not.toContain('a@example.com');
  });

  it('exports no credential: an exported user carries no password field', async () => {
    exportRepo.getProjectCdmProvisionedUsers.mockResolvedValue([
      { userId: 'u1', name: 'Ada', metadata: {} },
    ]);

    const [row] = await createEntity().export({ projectId, tx } as never);

    expect(row).not.toHaveProperty('password');
  });
});

describe('UserProvisionCdmEntity postApply (project credentials, ADR 0011 slice 3)', () => {
  const memberId = '30000000-0000-4000-8000-000000000001';
  const strangerId = '30000000-0000-4000-8000-000000000002';
  const hash = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';

  function row(externalKey: string, withPassword: boolean, documentIndex?: number) {
    return {
      externalKey,
      findBy: 'email' as const,
      name: 'A',
      ...(documentIndex === undefined ? {} : { documentIndex }),
      ...(withPassword ? { password: { algorithm: 'bcrypt' as const, hash } } : {}),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    projectUsers.filterMemberUserIds.mockResolvedValue([memberId]);
    credentials.importProjectPasswordHashes.mockResolvedValue({
      imported: 2,
      updated: 1,
      unchanged: 3,
      skippedExisting: 4,
    });
  });

  it('is the only handler step that writes: apply never touches a credential', async () => {
    const ctx = createCtx();
    userAuthenticationMethods.getUserAuthenticationMethodByEmail.mockResolvedValue(null);
    userAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({});
    userRepository.findUserIdByCdmImport.mockResolvedValue(null);
    users.createUser.mockResolvedValue({ id: 'new-user-id' });

    await createEntity().apply(ctx, [row('a@example.com', true)]);

    expect(credentials.importProjectPasswordHashes).not.toHaveBeenCalled();
    expect(projectUsers.filterMemberUserIds).not.toHaveBeenCalled();
    expect(ctx.result.warnings).toEqual([]);
  });

  it('reads membership once in the import transaction, then imports the hashes in one call', async () => {
    const ctx = createCtx();
    ctx.produced.userIds.set('a@example.com', memberId);
    ctx.produced.userIds.set('b@example.com', memberId);

    await createEntity().postApply(ctx, [
      row('a@example.com', true),
      row('b@example.com', true),
      row('c@example.com', false),
    ]);

    expect(projectUsers.filterMemberUserIds).toHaveBeenCalledTimes(1);
    expect(projectUsers.filterMemberUserIds).toHaveBeenCalledWith(
      { projectId, userIds: [memberId] },
      tx
    );
    expect(credentials.importProjectPasswordHashes).toHaveBeenCalledTimes(1);
    expect(credentials.importProjectPasswordHashes).toHaveBeenCalledWith(
      {
        projectId,
        rows: [
          { userId: memberId, hash },
          { userId: memberId, hash },
        ],
      },
      tx
    );
    expect(ctx.result).toMatchObject({
      passwordsImported: 2,
      passwordsUpdated: 1,
      passwordsUnchanged: 3,
      passwordsSkippedExisting: 4,
    });
  });

  it('does nothing, and reads nothing, when no row carries a password', async () => {
    const ctx = createCtx();
    ctx.produced.userIds.set('a@example.com', memberId);

    await createEntity().postApply(ctx, [row('a@example.com', false)]);

    expect(projectUsers.filterMemberUserIds).not.toHaveBeenCalled();
    expect(credentials.importProjectPasswordHashes).not.toHaveBeenCalled();
  });

  it('refuses every non-member by document position, with no address and no hash, writing nothing', async () => {
    const ctx = createCtx();
    ctx.produced.userIds.set('a@example.com', memberId);
    ctx.produced.userIds.set('b@example.com', strangerId);

    let message = '';
    try {
      await createEntity().postApply(ctx, [
        row('a@example.com', true, 0),
        row('b@example.com', true, 4),
      ]);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      message = (error as Error).message;
    }

    expect(message).toContain('users[4]');
    expect(message).not.toContain('users[0]');
    expect(message).not.toContain('example.com');
    expect(message).not.toContain(hash);
    expect(credentials.importProjectPasswordHashes).not.toHaveBeenCalled();
    expect(ctx.result.passwordsImported).toBe(0);
  });

  it('refuses a row whose user was never resolved, as a non-member', async () => {
    const ctx = createCtx();

    await expect(createEntity().postApply(ctx, [row('a@example.com', true, 2)])).rejects.toThrow(
      /users\[2\]/
    );
    expect(credentials.importProjectPasswordHashes).not.toHaveBeenCalled();
  });

  it('caps the positions it names and counts the rest', async () => {
    const ctx = createCtx();
    const rows = Array.from({ length: 14 }, (_, i) => {
      ctx.produced.userIds.set(`s${i}@example.com`, strangerId);
      return row(`s${i}@example.com`, true, i);
    });

    const message = await createEntity()
      .postApply(ctx, rows)
      .catch((error: Error) => error.message);

    expect(message).toContain('users[9]');
    expect(message).not.toContain('users[10]');
    expect(message).toContain('and 4 more');
  });
});

describe('UserProvisionCdmEntity key.grantUserId match', () => {
  const externalKey = 'legacy-user-17';
  const grantUserId = '30000000-0000-4000-8000-000000000001';
  const otherUserId = '30000000-0000-4000-8000-000000000002';
  const otherProjectId = '10000000-0000-4000-8000-000000000012';
  const row = {
    externalKey,
    findBy: 'key' as const,
    name: 'Matched User',
    metadata: null,
    grantUserId,
  };
  const marker = (overrides: Record<string, unknown> = {}) => ({
    projectId,
    kind: 'user',
    externalKey,
    ...overrides,
  });

  async function refusal(
    markers: { globalMarker: unknown; membershipMarker: unknown } | null,
    foundByKey: string | null = null,
    position = 0
  ): Promise<string> {
    userRepository.findUserIdByCdmImport.mockResolvedValue(foundByKey);
    userRepository.findLiveUserCdmMarkers.mockResolvedValue(markers);
    try {
      await createEntity().apply(createCtx(), [{ ...row, documentIndex: position }]);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      return (error as Error).message;
    }
    throw new Error('expected the import to be refused');
  }

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository.findUserIdByCdmImport.mockResolvedValue(null);
    userRepository.findLiveUserCdmMarkers.mockResolvedValue({
      globalMarker: null,
      membershipMarker: null,
    });
    users.createUser.mockResolvedValue({ id: 'new-user-id' });
  });

  it('records the hinted user as the key without creating one or touching global metadata', async () => {
    const ctx = createCtx();

    await createEntity().apply(ctx, [row]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(userRepository.findLiveUserCdmMarkers).toHaveBeenCalledWith(
      { userId: grantUserId, projectId },
      tx
    );
    expect(ctx.produced.userIds.get(externalKey)).toBe(grantUserId);
    expect(ctx.assignmentUserIds.has(grantUserId)).toBe(true);
    expect(ctx.result.usersCreated).toBe(0);
  });

  it('matches again on a repeat import before the assignment marked the user (idempotent)', async () => {
    const first = createCtx();
    const second = createCtx();

    await createEntity().apply(first, [row]);
    await createEntity().apply(second, [row]);

    expect(users.createUser).not.toHaveBeenCalled();
    expect(second.produced.userIds.get(externalKey)).toBe(grantUserId);
  });

  it('reuses the keyed user without reading the hinted one when the hint agrees', async () => {
    userRepository.findUserIdByCdmImport.mockResolvedValue(grantUserId);
    const ctx = createCtx();

    await createEntity().apply(ctx, [row]);

    expect(userRepository.findLiveUserCdmMarkers).not.toHaveBeenCalled();
    expect(users.createUser).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.get(externalKey)).toBe(grantUserId);
  });

  it('reuses the keyed user when no hint is given, as before', async () => {
    userRepository.findUserIdByCdmImport.mockResolvedValue(otherUserId);
    const ctx = createCtx();

    await createEntity().apply(ctx, [{ ...row, grantUserId: null }]);

    expect(userRepository.findLiveUserCdmMarkers).not.toHaveBeenCalled();
    expect(ctx.produced.userIds.get(externalKey)).toBe(otherUserId);
  });

  it('creates a user as before when there is no hint and nothing carries the key', async () => {
    const ctx = createCtx();

    await createEntity().apply(ctx, [{ ...row, grantUserId: null }]);

    expect(userRepository.findLiveUserCdmMarkers).not.toHaveBeenCalled();
    expect(users.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Matched User',
        metadata: { cdmImport: { projectId, kind: 'user', externalKey } },
      }),
      tx
    );
    expect(ctx.result.usersCreated).toBe(1);
  });

  describe('refusals (each fails the import, names the position, never the key or an id)', () => {
    it('refuses a hint that differs from the user already imported under this key', async () => {
      const message = await refusal(null, otherUserId, 3);
      expect(message).toBe(
        'users[3]: grantUserId names another user than the one already imported under this key'
      );
      expect(users.createUser).not.toHaveBeenCalled();
    });

    it('refuses a hint that names no user', async () => {
      const message = await refusal(null, null, 2);
      expect(message).toBe('users[2]: grantUserId does not name an existing user');
      expect(users.createUser).not.toHaveBeenCalled();
    });

    it('refuses a soft-deleted user (the read returns none for it) and never falls back to creating one', async () => {
      userRepository.findUserIdByCdmImport.mockResolvedValue(null);
      userRepository.findLiveUserCdmMarkers.mockResolvedValue(null);

      await expect(createEntity().apply(createCtx(), [row])).rejects.toThrow(
        /grantUserId does not name an existing user/
      );
      expect(users.createUser).not.toHaveBeenCalled();
    });

    it('refuses a user whose membership row carries a marker with another key', async () => {
      const message = await refusal({
        globalMarker: null,
        membershipMarker: marker({ externalKey: 'someone-elses-key' }),
      });
      expect(message).toBe('users[0]: grantUserId is already imported under another key');
    });

    it('refuses a user whose global marker names this project with another key', async () => {
      const message = await refusal({
        globalMarker: marker({ externalKey: 'someone-elses-key' }),
        membershipMarker: null,
      });
      expect(message).toBe('users[0]: grantUserId is already imported under another key');
    });

    it("does not refuse a user whose marker is another project's", async () => {
      const ctx = createCtx();
      userRepository.findLiveUserCdmMarkers.mockResolvedValue({
        globalMarker: marker({ projectId: otherProjectId, externalKey: 'other-projects-key' }),
        membershipMarker: null,
      });

      await createEntity().apply(ctx, [row]);

      expect(ctx.produced.userIds.get(externalKey)).toBe(grantUserId);
    });

    it.each([
      ['other-user-under-key', null, otherUserId],
      ['user-not-found', null, null],
      ['other-key', { globalMarker: marker({ externalKey: 'x' }), membershipMarker: null }, null],
    ] as const)(
      '%s: the message carries neither the key nor an id',
      async (_label, markers, found) => {
        const message = await refusal(
          markers as { globalMarker: unknown; membershipMarker: unknown } | null,
          found
        );
        for (const secret of [externalKey, grantUserId, otherUserId, projectId, 'someone']) {
          expect(message).not.toContain(secret);
        }
      }
    );

    it('names the position in the document, not in the provisioned list', async () => {
      const message = await refusal(null, null, 7);
      expect(message).toMatch(/^users\[7\]:/);
    });
  });

  it('refuses two entries of one document that name the same user under different keys', async () => {
    const ctx = createCtx();

    await expect(
      createEntity().apply(ctx, [
        { ...row, documentIndex: 0 },
        { ...row, externalKey: 'second-key', documentIndex: 1 },
      ])
    ).rejects.toThrow('users[1]: grantUserId is already imported under another key');
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('rejects the hint on an email identity at validateInput as well', () => {
    expect(() =>
      createEntity().validateInput([
        { externalKey: 'a@example.com', findBy: 'email', name: 'A', grantUserId },
      ])
    ).toThrow(/grantUserId is only allowed with key.findBy 'key'/);
  });
});
