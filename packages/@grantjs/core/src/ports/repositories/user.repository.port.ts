/**
 * User-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type {
  AddUserGroupInput,
  AddUserRoleInput,
  AddUserTagInput,
  AssignUserPermissionInput,
  CreateUserAuthenticationMethodInput,
  CreateUserInput,
  CreateUserSessionInput,
  DeleteUserAuthenticationMethodInput,
  DeleteUserSessionInput,
  GetUserAuthenticationMethodsInput,
  GetUserSessionsInput,
  MutationDeleteUserArgs,
  QueryUserGroupsInput,
  QueryUserPermissionsInput,
  QueryUserRolesInput,
  QueryUsersArgs,
  QueryUserTagsInput,
  RemoveUserGroupInput,
  RemoveUserRoleInput,
  RemoveUserTagInput,
  RevokeUserPermissionInput,
  UpdateUserAuthenticationMethodInput,
  UpdateUserInput,
  UpdateUserSessionInput,
  UpdateUserTagInput,
  User,
  UserAuthenticationMethod,
  UserGroup,
  UserPage,
  UserPermission,
  UserRole,
  UserSession,
  UserSessionPage,
  UserTag,
} from '@grantjs/schema';

import type { SelectedFields } from './common';

export interface IUserRepository {
  getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & SelectedFields<User>,
    transaction?: unknown
  ): Promise<UserPage>;

  createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: unknown
  ): Promise<User>;

  /**
   * Lookup a user row created by CDM import (`metadata.cdmImport`) for idempotent re-import.
   */
  findUserIdByCdmImport(
    params: { projectId: string; kind: string; externalKey: string },
    transaction?: unknown
  ): Promise<string | null>;

  updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'>,
    transaction?: unknown
  ): Promise<User>;

  softDeleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'>,
    transaction?: unknown
  ): Promise<User>;

  hardDeleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'>,
    transaction?: unknown
  ): Promise<User>;
}

export interface IUserRoleRepository {
  getUserRoles(params: QueryUserRolesInput, transaction?: unknown): Promise<UserRole[]>;
  getUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<UserRole[]>;
  countUserRoles(params: { userId: string }, transaction?: unknown): Promise<number>;
  countUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<Map<string, number>>;
  addUserRole(params: AddUserRoleInput, transaction?: unknown): Promise<UserRole>;
  softDeleteUserRole(params: RemoveUserRoleInput, transaction?: unknown): Promise<UserRole>;
  hardDeleteUserRole(params: RemoveUserRoleInput, transaction?: unknown): Promise<UserRole>;
}

export interface IUserGroupRepository {
  getUserGroups(params: QueryUserGroupsInput, transaction?: unknown): Promise<UserGroup[]>;
  countUserGroups(params: { userId: string }, transaction?: unknown): Promise<number>;
  addUserGroup(params: AddUserGroupInput, transaction?: unknown): Promise<UserGroup>;
  softDeleteUserGroup(params: RemoveUserGroupInput, transaction?: unknown): Promise<UserGroup>;
  hardDeleteUserGroup(params: RemoveUserGroupInput, transaction?: unknown): Promise<UserGroup>;
}

export interface IUserPermissionRepository {
  getUserPermissions(
    params: QueryUserPermissionsInput,
    transaction?: unknown
  ): Promise<UserPermission[]>;
  getUserPermissionsByUserIds(userIds: string[], transaction?: unknown): Promise<UserPermission[]>;
  countUserPermissions(params: { userId: string }, transaction?: unknown): Promise<number>;
  countUserPermissionsByUserIds(
    userIds: string[],
    transaction?: unknown
  ): Promise<Map<string, number>>;
  addUserPermission(
    params: AssignUserPermissionInput,
    transaction?: unknown
  ): Promise<UserPermission>;
  softDeleteUserPermission(
    params: RevokeUserPermissionInput,
    transaction?: unknown
  ): Promise<UserPermission>;
  hardDeleteUserPermission(
    params: RevokeUserPermissionInput,
    transaction?: unknown
  ): Promise<UserPermission>;
}

export interface IUserTagRepository {
  getUserTags(params: QueryUserTagsInput, transaction?: unknown): Promise<UserTag[]>;
  getUserTagsByUserIds(userIds: string[], transaction?: unknown): Promise<UserTag[]>;
  getUserTag(params: QueryUserTagsInput, transaction?: unknown): Promise<UserTag>;
  getUserTagIntersection(
    userIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<UserTag[]>;
  addUserTag(params: AddUserTagInput, transaction?: unknown): Promise<UserTag>;
  updateUserTag(params: UpdateUserTagInput, transaction?: unknown): Promise<UserTag>;
  softDeleteUserTag(params: RemoveUserTagInput, transaction?: unknown): Promise<UserTag>;
  hardDeleteUserTag(params: RemoveUserTagInput, transaction?: unknown): Promise<UserTag>;
}

export interface IUserSessionRepository {
  getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: unknown
  ): Promise<UserSessionPage>;

  createUserSession(
    session: CreateUserSessionInput & { audience: string },
    transaction?: unknown
  ): Promise<UserSession>;

  getLastValidUserSession(userId: string, audience: string, token?: string): Promise<UserSession>;

  getSessionByRefreshToken(token: string, transaction?: unknown): Promise<UserSession | undefined>;

  updateUserSession(params: UpdateUserSessionInput, transaction?: unknown): Promise<UserSession>;

  refreshUserSession(
    id: string,
    token: string,
    expiresAt: Date,
    lastUsedAt: Date,
    userAgent?: string | null,
    ipAddress?: string | null,
    transaction?: unknown
  ): Promise<UserSession>;

  softDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: unknown
  ): Promise<UserSession>;

  hardDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: unknown
  ): Promise<UserSession>;
}

export interface IUserAuthenticationMethodRepository {
  getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod[]>;

  getUserAuthenticationMethod(id: string, transaction?: unknown): Promise<UserAuthenticationMethod>;

  findByProviderAndProviderId(
    provider: string,
    providerId: string,
    providerData?: Record<string, unknown>,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod | null>;

  createUserAuthenticationMethod(
    params: Omit<CreateUserAuthenticationMethodInput, 'providerData'> & {
      providerData?: Record<string, unknown>;
    },
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  updateUserAuthenticationMethod(
    id: string,
    input: UpdateUserAuthenticationMethodInput,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  softDeleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  hardDeleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  findByToken(token: string, transaction?: unknown): Promise<UserAuthenticationMethod | null>;

  findByEmail(email: string, transaction?: unknown): Promise<UserAuthenticationMethod | null>;
}

export interface IUserMfaFactorRecord {
  id: string;
  userId: string;
  type: string;
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
  isPrimary: boolean;
  isEnabled: boolean;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IUserMfaFactorRepository {
  listFactors(userId: string, transaction?: unknown): Promise<IUserMfaFactorRecord[]>;
  getPrimaryFactor(userId: string, transaction?: unknown): Promise<IUserMfaFactorRecord | null>;
  upsertPrimaryFactor(
    params: {
      userId: string;
      type: string;
      encryptedSecret: string;
      secretIv: string;
      secretTag: string;
      isEnabled: boolean;
    },
    transaction?: unknown
  ): Promise<IUserMfaFactorRecord>;
  enableFactor(factorId: string, transaction?: unknown): Promise<IUserMfaFactorRecord>;
  touchFactorLastUsed(factorId: string, transaction?: unknown): Promise<IUserMfaFactorRecord>;
  setPrimaryFactor(
    factorId: string,
    userId: string,
    transaction?: unknown
  ): Promise<IUserMfaFactorRecord>;
  removeFactor(
    factorId: string,
    userId: string,
    transaction?: unknown
  ): Promise<IUserMfaFactorRecord>;
}

export interface IUserMfaRecoveryCodeRecord {
  id: string;
  userId: string;
  userMfaFactorId?: string | null;
  codeHash: string;
  isUsed: boolean;
  usedAt?: Date | null;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface IMfaRecoveryCodeStatus {
  activeCount: number;
  lastGeneratedAt: Date | null;
}

export interface IUserMfaRecoveryCodeRepository {
  listCodes(userId: string, transaction?: unknown): Promise<IUserMfaRecoveryCodeRecord[]>;
  createCodes(
    userId: string,
    codeHashes: string[],
    userMfaFactorId?: string | null,
    transaction?: unknown
  ): Promise<IUserMfaRecoveryCodeRecord[]>;
  softDeleteAllCodes(userId: string, transaction?: unknown): Promise<void>;
  markCodeUsed(codeId: string, transaction?: unknown): Promise<IUserMfaRecoveryCodeRecord>;
  getRecoveryCodeStatus(userId: string, transaction?: unknown): Promise<IMfaRecoveryCodeStatus>;
}
