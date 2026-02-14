/**
 * User-domain repository port interfaces.
 * Implementations (Drizzle-based) live in apps/api.
 */
import type { SelectedFields } from './common';
import type {
  AddUserRoleInput,
  AddUserTagInput,
  CreateUserAuthenticationMethodInput,
  CreateUserInput,
  CreateUserSessionInput,
  DeleteUserAuthenticationMethodInput,
  DeleteUserSessionInput,
  GetUserAuthenticationMethodsInput,
  GetUserSessionsInput,
  MutationDeleteUserArgs,
  QueryUserRolesInput,
  QueryUserTagsInput,
  QueryUsersArgs,
  RemoveUserRoleInput,
  RemoveUserTagInput,
  UpdateUserAuthenticationMethodInput,
  UpdateUserInput,
  UpdateUserSessionInput,
  UpdateUserTagInput,
  User,
  UserAuthenticationMethod,
  UserPage,
  UserRole,
  UserSession,
  UserSessionPage,
  UserTag,
} from '@grantjs/schema';

export interface IUserRepository {
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
  addUserRole(params: AddUserRoleInput, transaction?: unknown): Promise<UserRole>;
  softDeleteUserRole(params: RemoveUserRoleInput, transaction?: unknown): Promise<UserRole>;
  hardDeleteUserRole(params: RemoveUserRoleInput, transaction?: unknown): Promise<UserRole>;
}

export interface IUserTagRepository {
  getUserTags(params: QueryUserTagsInput, transaction?: unknown): Promise<UserTag[]>;
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
