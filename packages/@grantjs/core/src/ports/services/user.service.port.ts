/**
 * User-domain service port interfaces.
 * Covers: User, UserRole, UserTag, UserSession, UserAuthenticationMethod.
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
  GetUserAuthenticationMethodsInput,
  GetUserSessionsInput,
  MutationDeleteUserArgs,
  QueryUserGroupsInput,
  QueryUserPermissionsInput,
  QueryUserRolesInput,
  QueryUsersArgs,
  RemoveUserGroupInput,
  RemoveUserRoleInput,
  RemoveUserTagInput,
  RevokeUserPermissionInput,
  UpdateUserAuthenticationMethodInput,
  UpdateUserInput,
  UpdateUserTagInput,
  User,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
  UserGroup,
  UserPage,
  UserPermission,
  UserRole,
  UserSession,
  UserSessionPage,
  UserTag,
} from '@grantjs/schema';

import type { DeleteParams, SelectedFields } from '../repositories/common';

// ---------------------------------------------------------------------------
// IUserService
// ---------------------------------------------------------------------------

export interface IUserService {
  getUsers(
    params: Omit<QueryUsersArgs, 'scope'> & SelectedFields<User>,
    transaction?: unknown
  ): Promise<UserPage>;

  createUser(
    params: Omit<CreateUserInput, 'scope' | 'roleIds' | 'tagIds'>,
    transaction?: unknown
  ): Promise<User>;

  updateUser(
    id: string,
    input: Omit<UpdateUserInput, 'scope'>,
    transaction?: unknown
  ): Promise<User>;

  deleteUser(
    params: Omit<MutationDeleteUserArgs, 'scope'> & DeleteParams,
    transaction?: unknown
  ): Promise<User>;

  deleteOwnUser(params: DeleteParams, transaction?: unknown): Promise<User>;
}

// ---------------------------------------------------------------------------
// IUserRoleService
// ---------------------------------------------------------------------------

export interface IUserRoleService {
  getUserRoles(params: QueryUserRolesInput, transaction?: unknown): Promise<UserRole[]>;

  getUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<UserRole[]>;

  countUserRoles(params: { userId: string }, transaction?: unknown): Promise<number>;

  countUserRolesByUserIds(userIds: string[], transaction?: unknown): Promise<Map<string, number>>;

  addUserRole(params: AddUserRoleInput, transaction?: unknown): Promise<UserRole>;

  removeUserRole(
    params: RemoveUserRoleInput & DeleteParams,
    transaction?: unknown
  ): Promise<UserRole>;
}

// ---------------------------------------------------------------------------
// IUserGroupService
// ---------------------------------------------------------------------------

export interface IUserGroupService {
  getUserGroups(params: QueryUserGroupsInput, transaction?: unknown): Promise<UserGroup[]>;

  countUserGroups(params: { userId: string }, transaction?: unknown): Promise<number>;

  addUserGroup(params: AddUserGroupInput, transaction?: unknown): Promise<UserGroup>;

  removeUserGroup(
    params: RemoveUserGroupInput & DeleteParams,
    transaction?: unknown
  ): Promise<UserGroup>;
}

// ---------------------------------------------------------------------------
// IUserPermissionService
// ---------------------------------------------------------------------------

export interface IUserPermissionService {
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

  assignUserPermission(
    params: AssignUserPermissionInput,
    transaction?: unknown
  ): Promise<UserPermission>;

  revokeUserPermission(
    params: RevokeUserPermissionInput & DeleteParams,
    transaction?: unknown
  ): Promise<UserPermission>;
}

// ---------------------------------------------------------------------------
// IUserTagService
// ---------------------------------------------------------------------------

export interface IUserTagService {
  getUserTags(params: { userId: string }, transaction?: unknown): Promise<UserTag[]>;

  getUserTagsByUserIds(userIds: string[], transaction?: unknown): Promise<UserTag[]>;

  getUserTagIntersection(
    userIds: string[],
    tagIds: string[],
    transaction?: unknown
  ): Promise<UserTag[]>;

  addUserTag(params: AddUserTagInput, transaction?: unknown): Promise<UserTag>;

  updateUserTag(params: UpdateUserTagInput, transaction?: unknown): Promise<UserTag>;

  removeUserTag(params: RemoveUserTagInput & DeleteParams, transaction?: unknown): Promise<UserTag>;

  removeUserTags(
    params: { tagId: string } & DeleteParams,
    transaction?: unknown
  ): Promise<UserTag[]>;
}

// ---------------------------------------------------------------------------
// IUserSessionService
// ---------------------------------------------------------------------------

interface CreateSessionResult {
  refreshToken: string;
  accessToken: string;
}

export interface MfaSetupResult {
  factorId: string;
  secret: string;
  otpAuthUrl: string;
}

export interface MfaDeviceInfo {
  id: string;
  name: string;
  isPrimary: boolean;
  isEnabled: boolean;
  createdAt: Date;
  lastUsedAt?: Date | null;
}

/** Optional claims when signing session JWTs (amr/acr/auth_time are derived if omitted). */
export interface SessionSignOptions {
  /** Unix seconds for `auth_time` claim; defaults from session `createdAt` when available. */
  authTimeSeconds?: number;
}

export interface IUserSessionService {
  getUserSession(userSessionId: string, transaction?: unknown): Promise<UserSession>;

  getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: unknown
  ): Promise<UserSessionPage>;

  signSession(
    session: UserSession,
    isVerified?: boolean,
    mfaVerified?: boolean,
    issuerBaseUrl?: string,
    signOptions?: SessionSignOptions
  ): Promise<CreateSessionResult>;

  createSession(
    params: Omit<CreateUserSessionInput, 'expiresAt' | 'token' | 'lastUsedAt'> & {
      isVerified?: boolean;
      mfaVerifiedAt?: Date | null;
    },
    transaction?: unknown,
    issuerBaseUrl?: string
  ): Promise<CreateSessionResult>;

  refreshSessionByRefreshToken(
    refreshToken: string,
    transaction?: unknown,
    userAgent?: string | null,
    ipAddress?: string | null,
    isVerified?: boolean,
    mfaVerified?: boolean,
    issuerBaseUrl?: string
  ): Promise<CreateSessionResult | null>;

  markMfaVerified(sessionId: string, transaction?: unknown): Promise<UserSession>;

  revokeSession(id: string, transaction?: unknown): Promise<UserSession>;

  revokeSessionByRefreshToken(refreshToken: string, transaction?: unknown): Promise<boolean>;

  refreshSessionLastUsed(sessionId: string, transaction?: unknown): Promise<UserSession>;
}

export interface IUserMfaService {
  listDevices(userId: string, transaction?: unknown): Promise<MfaDeviceInfo[]>;
  setupTotp(userId: string, accountName: string, transaction?: unknown): Promise<MfaSetupResult>;
  verifyTotp(
    userId: string,
    code: string,
    transaction?: unknown
  ): Promise<{ factorId: string; verified: boolean }>;
  setPrimaryDevice(userId: string, factorId: string, transaction?: unknown): Promise<MfaDeviceInfo>;
  removeDevice(userId: string, factorId: string, transaction?: unknown): Promise<void>;
  generateRecoveryCodes(
    userId: string,
    factorId?: string | null,
    transaction?: unknown
  ): Promise<string[]>;
  verifyRecoveryCode(userId: string, recoveryCode: string, transaction?: unknown): Promise<boolean>;

  getMyMfaRecoveryCodeStatus(
    userId: string,
    transaction?: unknown
  ): Promise<{ activeCount: number; lastGeneratedAt: Date | null }>;

  /** True if the user has at least one non-deleted MFA factor with isEnabled (fully enrolled). */
  hasActiveMfaEnrollment(userId: string, transaction?: unknown): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// IUserAuthenticationMethodService
// ---------------------------------------------------------------------------

export interface IUserAuthenticationMethodService {
  getUserAuthenticationMethod(id: string, transaction?: unknown): Promise<UserAuthenticationMethod>;

  getUserAuthenticationMethodByProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    requestedFields?: string[],
    transaction?: unknown
  ): Promise<UserAuthenticationMethod | null>;

  getUserAuthenticationMethodByEmail(
    email: string,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod | null>;

  getUserAuthenticationMethods(
    params: GetUserAuthenticationMethodsInput & SelectedFields<UserAuthenticationMethod>,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod[]>;

  createUserAuthenticationMethod(
    params: Omit<CreateUserAuthenticationMethodInput, 'providerData'> & {
      providerData?: Record<string, unknown>;
    },
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  updateUserAuthenticationMethod(
    id: string,
    input: UpdateUserAuthenticationMethodInput & { providerData?: Record<string, unknown> },
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  setPrimaryAuthenticationMethod(
    userId: string,
    methodId: string,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  deleteUserAuthenticationMethod(
    params: DeleteUserAuthenticationMethodInput & DeleteParams,
    transaction?: unknown
  ): Promise<UserAuthenticationMethod>;

  processProvider(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    providerData: Record<string, unknown>
  ): Promise<{ providerData: Record<string, unknown>; isVerified: boolean; name: string }>;

  generateOtp(): { token: string; validUntil: number };

  generatePasswordResetOtp(): { token: string; validUntil: number };

  verifyEmail(token: string, transaction?: unknown): Promise<UserAuthenticationMethod>;

  resendVerificationEmail(
    email: string,
    transaction?: unknown
  ): Promise<{ token: string; validUntil: number }>;

  requestPasswordReset(
    email: string,
    transaction?: unknown
  ): Promise<{ token: string; validUntil: number } | null>;

  resetPassword(token: string, newPassword: string, transaction?: unknown): Promise<string | null>;

  invalidateAllUserSessions(userId: string, transaction?: unknown): Promise<void>;

  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    transaction?: unknown
  ): Promise<void>;
}
