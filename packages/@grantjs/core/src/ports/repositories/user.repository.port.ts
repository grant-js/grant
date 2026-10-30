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

import type { IEntityExistence, OptionalListScope, SelectedFields } from './common';

export interface IUserRepository extends IEntityExistence {
  getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & OptionalListScope & SelectedFields<User>,
    transaction?: unknown
  ): Promise<UserPage>;

  createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: unknown
  ): Promise<User>;

  /**
   * The live user an earlier CDM import of `projectId` keyed as `kind` / `externalKey`, for
   * idempotent re-import. Matches the global user's `metadata.cdmImport` first, then the live
   * `project_users` row's of that project (a reused identity carries its marker there, never
   * globally). A soft-deleted user never matches, nor a soft-deleted row.
   */
  findUserIdByCdmImport(
    params: { projectId: string; kind: string; externalKey: string },
    transaction?: unknown
  ): Promise<string | null>;

  /**
   * The import markers of a live user, for the `key.grantUserId` match rule: the global
   * user's `metadata.cdmImport` and that of the user's live `project_users` row in
   * `projectId`, each `null` when absent. `null` when the user does not exist or is
   * soft-deleted.
   */
  findLiveUserCdmMarkers(
    params: { userId: string; projectId: string },
    transaction?: unknown
  ): Promise<{ globalMarker: unknown; membershipMarker: unknown } | null>;

  updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'> & { picturePath?: string | null },
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

  /**
   * Non-deleted users excluding the seeded system user (not an operator).
   */
  countHumanUsers(systemUserId: string, transaction?: unknown): Promise<number>;

  /**
   * The user's live project memberships (`project_users`, not soft-deleted): the project
   * and the membership row's metadata. Read by the user delete, before the memberships go,
   * to name the user's import keys on the `user.deleted` event.
   */
  getUserMembershipMetadata(
    userId: string,
    transaction?: unknown
  ): Promise<Array<{ projectId: string; metadata: unknown }>>;
}

export interface IUserRoleRepository {
  getUserRoles(params: QueryUserRolesInput, transaction?: unknown): Promise<UserRole[]>;
  getUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<UserRole[]>;
  countUserRoles(params: { userId: string }, transaction?: unknown): Promise<number>;
  countUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<Map<string, number>>;
  addUserRole(params: AddUserRoleInput, transaction?: unknown): Promise<UserRole>;
  addUserRoles(params: readonly AddUserRoleInput[], transaction?: unknown): Promise<UserRole[]>;
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

  /**
   * CAS rotate: succeeds only when `id` still holds `expectedToken`.
   * Stores `expectedToken` as `previousToken` so later reuse can be detected.
   */
  refreshUserSession(
    id: string,
    expectedToken: string,
    nextToken: string,
    expiresAt: Date,
    lastUsedAt: Date,
    userAgent?: string | null,
    ipAddress?: string | null,
    transaction?: unknown
  ): Promise<UserSession | null>;

  findFamilyIdByPreviousRefreshToken(token: string, transaction?: unknown): Promise<string | null>;

  getSessionFamilyId(sessionId: string, transaction?: unknown): Promise<string | null>;

  listActiveSessionsInFamily(familyId: string, transaction?: unknown): Promise<UserSession[]>;

  softDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: unknown
  ): Promise<UserSession>;

  hardDeleteUserSession(
    params: DeleteUserSessionInput,
    transaction?: unknown
  ): Promise<UserSession>;
}

export interface IUserAuthenticationMethodRepository extends IEntityExistence {
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

  /**
   * The Email method holding a password-reset token, found by the SHA-256 of the token
   * (ADR 0011 § 3). The token itself is never stored, so it is never scanned for.
   */
  findByPasswordResetTokenHash(
    tokenHash: string,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod | null>;

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
