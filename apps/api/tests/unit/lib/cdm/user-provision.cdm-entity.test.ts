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
