/**
 * User-domain service port interfaces.
 * Covers: User, UserRole, UserTag, UserSession, UserAuthenticationMethod.
 */
import type { SelectedFields } from '../repositories/common';
import type {
  AddUserRoleInput,
  AddUserTagInput,
  CreateUserAuthenticationMethodInput,
  CreateUserInput,
  CreateUserSessionInput,
  DeleteUserAuthenticationMethodInput,
  GetUserAuthenticationMethodsInput,
  GetUserSessionsInput,
  MutationDeleteUserArgs,
  QueryUserRolesInput,
  QueryUsersArgs,
  RemoveUserRoleInput,
  RemoveUserTagInput,
  UpdateUserAuthenticationMethodInput,
  UpdateUserInput,
  UpdateUserTagInput,
  User,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
  UserPage,
  UserRole,
  UserSession,
  UserSessionPage,
  UserTag,
} from '@grantjs/schema';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Common deletion flags (soft vs hard delete) */
export interface DeleteParams {
  hardDelete?: boolean | null;
}

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

  addUserRole(params: AddUserRoleInput, transaction?: unknown): Promise<UserRole>;

  removeUserRole(
    params: RemoveUserRoleInput & DeleteParams,
    transaction?: unknown
  ): Promise<UserRole>;
}

// ---------------------------------------------------------------------------
// IUserTagService
// ---------------------------------------------------------------------------

export interface IUserTagService {
  getUserTags(params: { userId: string }, transaction?: unknown): Promise<UserTag[]>;

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

export interface IUserSessionService {
  getUserSession(userSessionId: string, transaction?: unknown): Promise<UserSession>;

  getUserSessions(
    params: GetUserSessionsInput & SelectedFields<UserSession>,
    transaction?: unknown
  ): Promise<UserSessionPage>;

  signSession(session: UserSession, isVerified?: boolean): Promise<CreateSessionResult>;

  createSession(
    params: Omit<CreateUserSessionInput, 'expiresAt' | 'token' | 'lastUsedAt'> & {
      isVerified?: boolean;
    },
    transaction?: unknown
  ): Promise<CreateSessionResult>;

  refreshSessionByRefreshToken(
    refreshToken: string,
    transaction?: unknown,
    userAgent?: string | null,
    ipAddress?: string | null,
    isVerified?: boolean
  ): Promise<CreateSessionResult | null>;

  revokeSession(id: string, transaction?: unknown): Promise<UserSession>;

  revokeSessionByRefreshToken(refreshToken: string, transaction?: unknown): Promise<boolean>;

  refreshSessionLastUsed(sessionId: string, transaction?: unknown): Promise<UserSession>;
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
