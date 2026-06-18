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

function createEntity(): UserProvisionCdmEntity {
  return new UserProvisionCdmEntity(
    exportRepo as never,
    users as never,
    userAuthenticationMethods as never,
    userRepository as never
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
