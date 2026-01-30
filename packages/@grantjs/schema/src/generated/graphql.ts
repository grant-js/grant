import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Date: { input: Date; output: Date };
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> };
};

export type AcceptInvitationInput = {
  scope: Scope;
  token: Scalars['String']['input'];
  userData?: InputMaybe<UserRegistrationData>;
};

export type AcceptInvitationResult = {
  __typename?: 'AcceptInvitationResult';
  accounts: Array<Account>;
  invitation?: Maybe<OrganizationInvitation>;
  isNewUser?: Maybe<Scalars['Boolean']['output']>;
  requiresRegistration: Scalars['Boolean']['output'];
  user?: Maybe<User>;
};

export type Account = Auditable & {
  __typename?: 'Account';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  owner: User;
  ownerId: Scalars['ID']['output'];
  projects?: Maybe<Array<Project>>;
  tags?: Maybe<Array<Tag>>;
  type: AccountType;
  updatedAt: Scalars['Date']['output'];
};

export type AccountExportData = {
  __typename?: 'AccountExportData';
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  type: AccountType;
  updatedAt: Scalars['Date']['output'];
};

export type AccountPage = PaginatedResults & {
  __typename?: 'AccountPage';
  accounts: Array<Account>;
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type AccountProject = Auditable & {
  __typename?: 'AccountProject';
  account?: Maybe<Account>;
  accountId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type AccountProjectApiKey = Auditable & {
  __typename?: 'AccountProjectApiKey';
  account?: Maybe<Account>;
  accountId: Scalars['ID']['output'];
  accountRoleId: Scalars['ID']['output'];
  apiKey?: Maybe<ApiKey>;
  apiKeyId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  updatedAt: Scalars['Date']['output'];
};

export type AccountProjectTag = Auditable & {
  __typename?: 'AccountProjectTag';
  account?: Maybe<Account>;
  accountId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type AccountRole = Auditable & {
  __typename?: 'AccountRole';
  account?: Maybe<Account>;
  accountId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export enum AccountSearchableField {
  Type = 'type',
}

export type AccountSortInput = {
  field: AccountSortableField;
  order: SortOrder;
};

export enum AccountSortableField {
  CreatedAt = 'createdAt',
  Type = 'type',
  UpdatedAt = 'updatedAt',
}

export type AccountTag = Auditable & {
  __typename?: 'AccountTag';
  account?: Maybe<Account>;
  accountId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export enum AccountType {
  Organization = 'organization',
  Personal = 'personal',
}

export type AddAccountProjectApiKeyInput = {
  accountId: Scalars['ID']['input'];
  accountRoleId: Scalars['ID']['input'];
  apiKeyId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddAccountProjectInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddAccountProjectTagInput = {
  accountId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddAccountRoleInput = {
  accountId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddAccountTagInput = {
  accountId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  tagId: Scalars['ID']['input'];
};

export type AddGroupPermissionInput = {
  groupId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type AddGroupTagInput = {
  groupId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  tagId: Scalars['ID']['input'];
};

export type AddOrganizationGroupInput = {
  groupId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};

export type AddOrganizationPermissionInput = {
  organizationId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type AddOrganizationProjectApiKeyInput = {
  apiKeyId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  organizationRoleId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddOrganizationProjectTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddOrganizationRoleInput = {
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddOrganizationTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddOrganizationUserInput = {
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddPermissionTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectGroupInput = {
  groupId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddProjectPermissionInput = {
  permissionId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type AddProjectResourceInput = {
  projectId: Scalars['ID']['input'];
  resourceId: Scalars['ID']['input'];
};

export type AddProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddProjectTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectUserApiKeyInput = {
  apiKeyId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddResourceTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  resourceId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddRoleGroupInput = {
  groupId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddRoleTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  roleId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddUserRoleInput = {
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddUserTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  tagId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type ApiKey = Auditable & {
  __typename?: 'ApiKey';
  clientId: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  createdBy: Scalars['ID']['output'];
  createdByUser?: Maybe<User>;
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isRevoked: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  revokedAt?: Maybe<Scalars['Date']['output']>;
  revokedBy?: Maybe<Scalars['ID']['output']>;
  revokedByUser?: Maybe<User>;
  /** Role bound to this API key (project-level keys only). Null for user-scoped keys. */
  role?: Maybe<Role>;
  updatedAt: Scalars['Date']['output'];
};

export type ApiKeyPage = PaginatedResults & {
  __typename?: 'ApiKeyPage';
  apiKeys: Array<ApiKey>;
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export enum ApiKeySearchableField {
  ClientId = 'clientId',
  Description = 'description',
  Name = 'name',
}

export type ApiKeySortInput = {
  field: ApiKeySortableField;
  order: SortOrder;
};

export enum ApiKeySortableField {
  CreatedAt = 'createdAt',
  ExpiresAt = 'expiresAt',
  LastUsedAt = 'lastUsedAt',
  Name = 'name',
}

export type Auditable = {
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type AuthenticationMethodExportData = {
  __typename?: 'AuthenticationMethodExportData';
  createdAt: Scalars['Date']['output'];
  isPrimary: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  provider: Scalars['String']['output'];
  providerId: Scalars['String']['output'];
};

export enum AuthorizationReason {
  InvalidAuthenticationState = 'INVALID_AUTHENTICATION_STATE',
  InvalidScope = 'INVALID_SCOPE',
  NotAuthenticated = 'NOT_AUTHENTICATED',
  NoMatchingPermissionFound = 'NO_MATCHING_PERMISSION_FOUND',
  PermissionFoundConditionNotMet = 'PERMISSION_FOUND_CONDITION_NOT_MET',
  PermissionGrantedConditionMet = 'PERMISSION_GRANTED_CONDITION_MET',
  PermissionGrantedNoCondition = 'PERMISSION_GRANTED_NO_CONDITION',
}

export type AuthorizationResult = {
  __typename?: 'AuthorizationResult';
  authorized: Scalars['Boolean']['output'];
  evaluatedContext?: Maybe<Scalars['JSON']['output']>;
  matchedCondition?: Maybe<Scalars['JSON']['output']>;
  matchedPermission?: Maybe<Permission>;
  reason?: Maybe<AuthorizationReason>;
};

export type ChangeMyPasswordInput = {
  confirmPassword: Scalars['String']['input'];
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type ChangeMyPasswordResult = {
  __typename?: 'ChangeMyPasswordResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Creatable = {
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CreateAccountInput = {
  ownerId: Scalars['String']['input'];
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
  type: AccountType;
};

export type CreateAccountResult = {
  __typename?: 'CreateAccountResult';
  accessToken: Scalars['String']['output'];
  account: Account;
  email?: Maybe<Scalars['String']['output']>;
  refreshToken: Scalars['String']['output'];
  requiresEmailVerification?: Maybe<Scalars['Boolean']['output']>;
  verificationExpiry?: Maybe<Scalars['Date']['output']>;
};

export type CreateApiKeyInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['Date']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** Required when scope.tenant is accountProject or organizationProject: the parent-tenant role the key impersonates. */
  roleId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
};

export type CreateApiKeyResult = {
  __typename?: 'CreateApiKeyResult';
  clientId: Scalars['String']['output'];
  clientSecret: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type CreateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  permissionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateMySecondaryAccountResult = {
  __typename?: 'CreateMySecondaryAccountResult';
  account: Account;
  accounts: Array<Account>;
};

export type CreateMyUserAuthenticationMethodInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
  scope: Scope;
};

export type CreateOrganizationInvitationInput = {
  email: Scalars['String']['input'];
  expiresAt: Scalars['Date']['input'];
  invitedAt?: InputMaybe<Scalars['Date']['input']>;
  invitedBy: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
  status?: InputMaybe<OrganizationInvitationStatus>;
  token: Scalars['String']['input'];
};

export type CreatePermissionInput = {
  action: Scalars['String']['input'];
  condition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  resourceId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateResourceInput = {
  actions?: InputMaybe<Array<Scalars['String']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  slug: Scalars['String']['input'];
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateTagInput = {
  color: Scalars['String']['input'];
  name: Scalars['String']['input'];
  scope: Scope;
};

export type CreateUserAuthenticationMethodInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type CreateUserInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  pictureUrl?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateUserSessionInput = {
  expiresAt: Scalars['Date']['input'];
  ipAddress?: InputMaybe<Scalars['String']['input']>;
  lastUsedAt: Scalars['Date']['input'];
  token: Scalars['String']['input'];
  userAgent?: InputMaybe<Scalars['String']['input']>;
  userAuthenticationMethodId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type DeleteApiKeyInput = {
  hardDelete?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type DeleteMyAccountsInput = {
  hardDelete?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DeleteUserAuthenticationMethodInput = {
  id: Scalars['ID']['input'];
};

export type DeleteUserSessionInput = {
  id: Scalars['ID']['input'];
};

export type ExchangeApiKeyInput = {
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  scope: Scope;
};

export type ExchangeApiKeyResult = {
  __typename?: 'ExchangeApiKeyResult';
  accessToken: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
};

export type GetUserAuthenticationMethodsInput = {
  provider?: InputMaybe<UserAuthenticationMethodProvider>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type GetUserSessionsInput = {
  audience?: InputMaybe<Scalars['String']['input']>;
  expiresAtMin?: InputMaybe<Scalars['Date']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  ipAddress?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  requestedFields?: InputMaybe<Array<Scalars['String']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<UserSessionSortInput>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Group = Auditable & {
  __typename?: 'Group';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export type GroupPage = PaginatedResults & {
  __typename?: 'GroupPage';
  groups: Array<Group>;
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type GroupPermission = Auditable & {
  __typename?: 'GroupPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type GroupPermissionGroupArgs = {
  scope: Scope;
};

export type GroupPermissionPermissionArgs = {
  scope: Scope;
};

export enum GroupSearchableField {
  Description = 'description',
  Name = 'name',
}

export type GroupSortInput = {
  field: GroupSortableField;
  order: SortOrder;
};

export enum GroupSortableField {
  Name = 'name',
}

export type GroupTag = Auditable & {
  __typename?: 'GroupTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type GroupTagGroupArgs = {
  scope: Scope;
};

export type GroupTagTagArgs = {
  scope: Scope;
};

export type InviteMemberInput = {
  email: Scalars['String']['input'];
  roleId: Scalars['ID']['input'];
  scope: Scope;
};

export type IsAuthorizedContextInput = {
  resource?: InputMaybe<Scalars['JSON']['input']>;
};

export type IsAuthorizedInput = {
  context: IsAuthorizedContextInput;
  permission: IsAuthorizedPermissionInput;
};

export type IsAuthorizedPermissionInput = {
  action: Scalars['String']['input'];
  resource: Scalars['String']['input'];
};

export type LoginInput = {
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  accessToken: Scalars['String']['output'];
  accounts: Array<Account>;
  email?: Maybe<Scalars['String']['output']>;
  refreshToken: Scalars['String']['output'];
  requiresEmailVerification?: Maybe<Scalars['Boolean']['output']>;
  verificationExpiry?: Maybe<Scalars['Date']['output']>;
};

export type LogoutMyUserResponse = {
  __typename?: 'LogoutMyUserResponse';
  message: Scalars['String']['output'];
};

export type MeResponse = {
  __typename?: 'MeResponse';
  accounts: Array<Account>;
  email?: Maybe<Scalars['String']['output']>;
  requiresEmailVerification?: Maybe<Scalars['Boolean']['output']>;
  verificationExpiry?: Maybe<Scalars['Date']['output']>;
};

export enum MemberType {
  Invitation = 'invitation',
  Member = 'member',
}

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  acceptInvitation: AcceptInvitationResult;
  changeMyPassword: ChangeMyPasswordResult;
  createApiKey: CreateApiKeyResult;
  createGroup: Group;
  createMySecondaryAccount: CreateMySecondaryAccountResult;
  createMyUserAuthenticationMethod: UserAuthenticationMethod;
  createOrganization: Organization;
  createPermission: Permission;
  createProject: Project;
  createResource: Resource;
  createRole: Role;
  createTag: Tag;
  createUser: User;
  deleteApiKey: ApiKey;
  deleteGroup: Group;
  deleteMyAccounts: User;
  deleteMyUserAuthenticationMethod: UserAuthenticationMethod;
  deleteOrganization: Organization;
  deletePermission: Permission;
  deleteProject: Project;
  deleteResource: Resource;
  deleteRole: Role;
  deleteTag: Tag;
  deleteUser: User;
  exchangeApiKey: ExchangeApiKeyResult;
  inviteMember: OrganizationInvitation;
  login: LoginResponse;
  logoutMyUser: LogoutMyUserResponse;
  refreshSession: RefreshSessionResponse;
  register: CreateAccountResult;
  removeOrganizationMember: OrganizationMember;
  renewInvitation: OrganizationInvitation;
  requestPasswordReset: RequestPasswordResetResponse;
  resendInvitationEmail: OrganizationInvitation;
  resendVerification: ResendVerificationResponse;
  resetPassword: ResetPasswordResponse;
  revokeApiKey: ApiKey;
  revokeInvitation: OrganizationInvitation;
  revokeMyUserSession: RevokeMyUserSessionResult;
  setMyPrimaryAuthenticationMethod: UserAuthenticationMethod;
  updateGroup: Group;
  updateMyUser: User;
  updateOrganization: Organization;
  updateOrganizationMember: OrganizationMember;
  updatePermission: Permission;
  updateProject: Project;
  updateResource: Resource;
  updateRole: Role;
  updateTag: Tag;
  updateUser: User;
  uploadMyUserPicture: UploadUserPictureResult;
  uploadUserPicture: UploadUserPictureResult;
  verifyEmail: VerifyEmailResponse;
};

export type MutationAcceptInvitationArgs = {
  input: AcceptInvitationInput;
};

export type MutationChangeMyPasswordArgs = {
  input: ChangeMyPasswordInput;
};

export type MutationCreateApiKeyArgs = {
  input: CreateApiKeyInput;
};

export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};

export type MutationCreateMyUserAuthenticationMethodArgs = {
  input: CreateMyUserAuthenticationMethodInput;
};

export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};

export type MutationCreatePermissionArgs = {
  input: CreatePermissionInput;
};

export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};

export type MutationCreateResourceArgs = {
  input: CreateResourceInput;
};

export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};

export type MutationCreateTagArgs = {
  input: CreateTagInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationDeleteApiKeyArgs = {
  input: DeleteApiKeyInput;
};

export type MutationDeleteGroupArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteMyAccountsArgs = {
  input: DeleteMyAccountsInput;
};

export type MutationDeleteMyUserAuthenticationMethodArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeletePermissionArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteResourceArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteTagArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationExchangeApiKeyArgs = {
  input: ExchangeApiKeyInput;
};

export type MutationInviteMemberArgs = {
  input: InviteMemberInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationRefreshSessionArgs = {
  accessToken: Scalars['String']['input'];
  refreshToken: Scalars['String']['input'];
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationRemoveOrganizationMemberArgs = {
  input: RemoveOrganizationMemberInput;
  userId: Scalars['ID']['input'];
};

export type MutationRenewInvitationArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};

export type MutationResendInvitationEmailArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationResendVerificationArgs = {
  input: ResendVerificationInput;
};

export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};

export type MutationRevokeApiKeyArgs = {
  input: RevokeApiKeyInput;
};

export type MutationRevokeInvitationArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationRevokeMyUserSessionArgs = {
  id: Scalars['ID']['input'];
};

export type MutationSetMyPrimaryAuthenticationMethodArgs = {
  id: Scalars['ID']['input'];
};

export type MutationUpdateGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGroupInput;
};

export type MutationUpdateMyUserArgs = {
  input: UpdateMyUserInput;
};

export type MutationUpdateOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
};

export type MutationUpdateOrganizationMemberArgs = {
  input: UpdateOrganizationMemberInput;
  userId: Scalars['ID']['input'];
};

export type MutationUpdatePermissionArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePermissionInput;
};

export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};

export type MutationUpdateResourceArgs = {
  id: Scalars['ID']['input'];
  input: UpdateResourceInput;
};

export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
};

export type MutationUpdateTagArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTagInput;
};

export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

export type MutationUploadMyUserPictureArgs = {
  input: UploadMyUserPictureInput;
};

export type MutationUploadUserPictureArgs = {
  input: UploadUserPictureInput;
};

export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
};

export type MyUserSessionsInput = {
  audience?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Organization = Auditable & {
  __typename?: 'Organization';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  projects?: Maybe<Array<Project>>;
  roles?: Maybe<Array<Role>>;
  slug: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
  users?: Maybe<Array<User>>;
};

export type OrganizationGroup = Auditable & {
  __typename?: 'OrganizationGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationInvitation = Auditable & {
  __typename?: 'OrganizationInvitation';
  acceptedAt?: Maybe<Scalars['Date']['output']>;
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  email: Scalars['String']['output'];
  expiresAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  invitedAt: Scalars['Date']['output'];
  invitedBy: Scalars['ID']['output'];
  inviter: User;
  organization: Organization;
  organizationId: Scalars['ID']['output'];
  role: Role;
  roleId: Scalars['ID']['output'];
  status: OrganizationInvitationStatus;
  token: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationInvitationPage = {
  __typename?: 'OrganizationInvitationPage';
  hasNextPage: Scalars['Boolean']['output'];
  invitations: Array<OrganizationInvitation>;
  totalCount: Scalars['Int']['output'];
};

export enum OrganizationInvitationSearchableField {
  Email = 'email',
}

export type OrganizationInvitationSortInput = {
  field: OrganizationInvitationSortableField;
  order: SortOrder;
};

export enum OrganizationInvitationSortableField {
  CreatedAt = 'createdAt',
  Email = 'email',
  ExpiresAt = 'expiresAt',
  Status = 'status',
}

export enum OrganizationInvitationStatus {
  Accepted = 'accepted',
  Expired = 'expired',
  Pending = 'pending',
  Revoked = 'revoked',
}

export type OrganizationMember = {
  __typename?: 'OrganizationMember';
  createdAt: Scalars['Date']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invitation?: Maybe<OrganizationInvitation>;
  name: Scalars['String']['output'];
  role: Role;
  status?: Maybe<OrganizationInvitationStatus>;
  type: MemberType;
  user?: Maybe<User>;
};

export type OrganizationMemberPage = {
  __typename?: 'OrganizationMemberPage';
  hasNextPage: Scalars['Boolean']['output'];
  members: Array<OrganizationMember>;
  totalCount: Scalars['Int']['output'];
};

export enum OrganizationMemberSearchableField {
  Email = 'email',
  Name = 'name',
}

export type OrganizationMemberSortInput = {
  field: OrganizationMemberSortableField;
  order: SortOrder;
};

export enum OrganizationMemberSortableField {
  CreatedAt = 'createdAt',
  Email = 'email',
  Name = 'name',
  Role = 'role',
}

export type OrganizationMembershipExportData = {
  __typename?: 'OrganizationMembershipExportData';
  joinedAt: Scalars['Date']['output'];
  organizationId: Scalars['ID']['output'];
  organizationName: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type OrganizationPage = PaginatedResults & {
  __typename?: 'OrganizationPage';
  hasNextPage: Scalars['Boolean']['output'];
  organizations: Array<Organization>;
  totalCount: Scalars['Int']['output'];
};

export type OrganizationPermission = Auditable & {
  __typename?: 'OrganizationPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationProject = Auditable & {
  __typename?: 'OrganizationProject';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationProjectApiKey = Auditable & {
  __typename?: 'OrganizationProjectApiKey';
  apiKey?: Maybe<ApiKey>;
  apiKeyId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  organizationRoleId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationProjectTag = Auditable & {
  __typename?: 'OrganizationProjectTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationRole = Auditable & {
  __typename?: 'OrganizationRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export enum OrganizationSearchableField {
  Name = 'name',
  Slug = 'slug',
}

export type OrganizationSortInput = {
  field: OrganizationSortableField;
  order: SortOrder;
};

export enum OrganizationSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt',
}

export type OrganizationTag = Auditable & {
  __typename?: 'OrganizationTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type OrganizationUser = Auditable & {
  __typename?: 'OrganizationUser';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organization?: Maybe<Organization>;
  organizationId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type PaginatedResults = {
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Permission = Auditable & {
  __typename?: 'Permission';
  action: Scalars['String']['output'];
  condition?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  resource?: Maybe<Resource>;
  resourceId?: Maybe<Scalars['ID']['output']>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export type PermissionPage = PaginatedResults & {
  __typename?: 'PermissionPage';
  hasNextPage: Scalars['Boolean']['output'];
  permissions: Array<Permission>;
  totalCount: Scalars['Int']['output'];
};

export enum PermissionSearchableField {
  Action = 'action',
  Description = 'description',
  Name = 'name',
}

export type PermissionSortInput = {
  field: PermissionSortableField;
  order: SortOrder;
};

export enum PermissionSortableField {
  Action = 'action',
  Name = 'name',
}

export type PermissionTag = Auditable & {
  __typename?: 'PermissionTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type PermissionTagPermissionArgs = {
  scope: Scope;
};

export type PermissionTagTagArgs = {
  scope: Scope;
};

export type Project = Auditable & {
  __typename?: 'Project';
  accountTags?: Maybe<Array<Tag>>;
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  organizationTags?: Maybe<Array<Tag>>;
  permissions?: Maybe<Array<Permission>>;
  resources?: Maybe<Array<Resource>>;
  roles?: Maybe<Array<Role>>;
  slug: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
  users?: Maybe<Array<User>>;
};

export type ProjectGroup = Auditable & {
  __typename?: 'ProjectGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ProjectGroupProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectMembershipExportData = {
  __typename?: 'ProjectMembershipExportData';
  joinedAt: Scalars['Date']['output'];
  projectId: Scalars['ID']['output'];
  projectName: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type ProjectPage = PaginatedResults & {
  __typename?: 'ProjectPage';
  hasNextPage: Scalars['Boolean']['output'];
  projects: Array<Project>;
  totalCount: Scalars['Int']['output'];
};

export type ProjectPermission = Auditable & {
  __typename?: 'ProjectPermission';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  permission?: Maybe<Permission>;
  permissionId: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ProjectPermissionProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectResource = Auditable & {
  __typename?: 'ProjectResource';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  resource?: Maybe<Resource>;
  resourceId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ProjectRole = Auditable & {
  __typename?: 'ProjectRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ProjectRoleProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export enum ProjectSearchableField {
  Description = 'description',
  Name = 'name',
  Slug = 'slug',
}

export type ProjectSortInput = {
  field: ProjectSortableField;
  order: SortOrder;
};

export enum ProjectSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt',
}

export type ProjectTag = Auditable & {
  __typename?: 'ProjectTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ProjectTagProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectUser = Auditable & {
  __typename?: 'ProjectUser';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type ProjectUserProjectArgs = {
  organizationId: Scalars['ID']['input'];
};

export type ProjectUserApiKey = Auditable & {
  __typename?: 'ProjectUserApiKey';
  apiKey?: Maybe<ApiKey>;
  apiKeyId: Scalars['ID']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  apiKeys: ApiKeyPage;
  groups: GroupPage;
  invitation?: Maybe<OrganizationInvitation>;
  isAuthorized: AuthorizationResult;
  me: MeResponse;
  myUserAuthenticationMethods: Array<UserAuthenticationMethod>;
  myUserDataExport: UserDataExport;
  myUserSessions: UserSessionPage;
  organizationInvitations: OrganizationInvitationPage;
  organizationMembers: OrganizationMemberPage;
  organizations: OrganizationPage;
  permissions: PermissionPage;
  projects: ProjectPage;
  resources: ResourcePage;
  roles: RolePage;
  tags: TagPage;
  users: UserPage;
};

export type QueryApiKeysArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ApiKeySortInput>;
};

export type QueryGroupsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<GroupSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryInvitationArgs = {
  token: Scalars['String']['input'];
};

export type QueryIsAuthorizedArgs = {
  input: IsAuthorizedInput;
};

export type QueryMyUserSessionsArgs = {
  input: MyUserSessionsInput;
};

export type QueryOrganizationInvitationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationInvitationSortInput>;
  status?: InputMaybe<OrganizationInvitationStatus>;
};

export type QueryOrganizationMembersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationMemberSortInput>;
  status?: InputMaybe<OrganizationInvitationStatus>;
};

export type QueryOrganizationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationSortInput>;
};

export type QueryPermissionsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<PermissionSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryProjectsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ProjectSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryResourcesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ResourceSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryRolesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<RoleSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryTagsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<TagSortInput>;
};

export type QueryUsersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<UserSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryAccountProjectApiKeysInput = {
  accountId?: InputMaybe<Scalars['ID']['input']>;
  apiKeyId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryAccountProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type QueryAccountProjectTagInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryAccountProjectsInput = {
  accountId: Scalars['ID']['input'];
};

export type QueryAccountRolesInput = {
  accountId: Scalars['ID']['input'];
};

export type QueryAccountTagsInput = {
  accountId: Scalars['ID']['input'];
};

export type QueryAccountsInput = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<AccountSortInput>;
};

export type QueryGroupPermissionsInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  permissionId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryGroupTagsInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationGroupsInput = {
  organizationId: Scalars['ID']['input'];
};

export type QueryOrganizationPermissionsInput = {
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  permissionId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationProjectApiKeysInput = {
  apiKeyId?: InputMaybe<Scalars['ID']['input']>;
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationProjectTagInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationProjectsInput = {
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryOrganizationRolesInput = {
  organizationId: Scalars['ID']['input'];
};

export type QueryOrganizationTagsInput = {
  organizationId: Scalars['ID']['input'];
};

export type QueryOrganizationUsersInput = {
  organizationId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryPermissionTagsInput = {
  permissionId?: InputMaybe<Scalars['ID']['input']>;
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryProjectGroupsInput = {
  projectId: Scalars['ID']['input'];
};

export type QueryProjectPermissionsInput = {
  permissionId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryProjectResourcesInput = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
  resourceId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryProjectRolesInput = {
  projectId: Scalars['ID']['input'];
};

export type QueryProjectTagsInput = {
  projectId: Scalars['ID']['input'];
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryProjectUserApiKeysInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type QueryProjectUsersInput = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryResourceTagsInput = {
  resourceId?: InputMaybe<Scalars['ID']['input']>;
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryRoleGroupsInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  roleId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryRoleTagsInput = {
  roleId?: InputMaybe<Scalars['ID']['input']>;
  tagId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryUserRolesInput = {
  roleId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type QueryUserTagsInput = {
  tagId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type RefreshSessionResponse = {
  __typename?: 'RefreshSessionResponse';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type RegisterInput = {
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
  type: AccountType;
};

export type RemoveAccountProjectApiKeyInput = {
  accountId: Scalars['ID']['input'];
  apiKeyId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveAccountProjectInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveAccountProjectTagInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveAccountRoleInput = {
  accountId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveAccountTagInput = {
  accountId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveGroupPermissionInput = {
  groupId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type RemoveGroupTagInput = {
  groupId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveOrganizationGroupInput = {
  groupId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};

export type RemoveOrganizationMemberInput = {
  scope: Scope;
};

export type RemoveOrganizationPermissionInput = {
  organizationId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type RemoveOrganizationProjectApiKeyInput = {
  apiKeyId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveOrganizationProjectTagInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveOrganizationRoleInput = {
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveOrganizationTagInput = {
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveOrganizationUserInput = {
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemovePermissionTagInput = {
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveProjectGroupInput = {
  groupId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveProjectPermissionInput = {
  permissionId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type RemoveProjectResourceInput = {
  projectId: Scalars['ID']['input'];
  resourceId: Scalars['ID']['input'];
};

export type RemoveProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveProjectTagInput = {
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveProjectUserApiKeyInput = {
  apiKeyId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveResourceTagInput = {
  resourceId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveRoleGroupInput = {
  groupId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveRoleTagInput = {
  roleId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveUserRoleInput = {
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveUserTagInput = {
  tagId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RequestPasswordResetInput = {
  email: Scalars['String']['input'];
};

export type RequestPasswordResetResponse = {
  __typename?: 'RequestPasswordResetResponse';
  message: Scalars['String']['output'];
  messageKey: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type ResendVerificationInput = {
  email: Scalars['String']['input'];
};

export type ResendVerificationResponse = {
  __typename?: 'ResendVerificationResponse';
  message: Scalars['String']['output'];
  messageKey?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type ResetPasswordResponse = {
  __typename?: 'ResetPasswordResponse';
  message: Scalars['String']['output'];
  messageKey: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Resource = Auditable & {
  __typename?: 'Resource';
  actions: Array<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  tags: Array<Tag>;
  updatedAt: Scalars['Date']['output'];
};

export type ResourcePage = PaginatedResults & {
  __typename?: 'ResourcePage';
  hasNextPage: Scalars['Boolean']['output'];
  resources: Array<Resource>;
  totalCount: Scalars['Int']['output'];
};

export enum ResourceSearchableField {
  Description = 'description',
  Name = 'name',
  Slug = 'slug',
}

export type ResourceSortInput = {
  field: ResourceSortableField;
  order: SortOrder;
};

export enum ResourceSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  Slug = 'slug',
  UpdatedAt = 'updatedAt',
}

export type ResourceTag = Auditable & {
  __typename?: 'ResourceTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  resource?: Maybe<Resource>;
  resourceId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ResourceTagResourceArgs = {
  scope: Scope;
};

export type ResourceTagTagArgs = {
  scope: Scope;
};

export type RevokeApiKeyInput = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type RevokeMyUserSessionResult = {
  __typename?: 'RevokeMyUserSessionResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Role = Auditable & {
  __typename?: 'Role';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export type RoleGroup = Auditable & {
  __typename?: 'RoleGroup';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  group?: Maybe<Group>;
  groupId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type RoleGroupGroupArgs = {
  scope: Scope;
};

export type RoleGroupRoleArgs = {
  scope: Scope;
};

export type RolePage = PaginatedResults & {
  __typename?: 'RolePage';
  hasNextPage: Scalars['Boolean']['output'];
  roles: Array<Role>;
  totalCount: Scalars['Int']['output'];
};

export enum RoleSearchableField {
  Description = 'description',
  Name = 'name',
}

export type RoleSortInput = {
  field: RoleSortableField;
  order: SortOrder;
};

export enum RoleSortableField {
  Name = 'name',
}

export type RoleTag = Auditable & {
  __typename?: 'RoleTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type RoleTagRoleArgs = {
  scope: Scope;
};

export type RoleTagTagArgs = {
  scope: Scope;
};

export type Scope = {
  id: Scalars['ID']['input'];
  tenant: Tenant;
};

export type Searchable = {
  ids?: Maybe<Array<Scalars['ID']['output']>>;
  limit?: Maybe<Scalars['Int']['output']>;
  page?: Maybe<Scalars['Int']['output']>;
  search?: Maybe<Scalars['String']['output']>;
};

export type SessionExportData = {
  __typename?: 'SessionExportData';
  createdAt: Scalars['Date']['output'];
  expiresAt: Scalars['Date']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  userAgent?: Maybe<Scalars['String']['output']>;
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type Tag = Auditable & {
  __typename?: 'Tag';
  color: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type TagPage = PaginatedResults & {
  __typename?: 'TagPage';
  hasNextPage: Scalars['Boolean']['output'];
  tags: Array<Tag>;
  totalCount: Scalars['Int']['output'];
};

export enum TagSearchableField {
  Name = 'name',
}

export enum TagSortField {
  Color = 'color',
  CreatedAt = 'createdAt',
  Name = 'name',
  UpdatedAt = 'updatedAt',
}

export type TagSortInput = {
  field: TagSortField;
  order: SortOrder;
};

export enum Tenant {
  Account = 'account',
  AccountProject = 'accountProject',
  AccountProjectUser = 'accountProjectUser',
  Organization = 'organization',
  OrganizationProject = 'organizationProject',
  OrganizationProjectUser = 'organizationProjectUser',
  ProjectUser = 'projectUser',
  System = 'system',
}

export enum TokenType {
  ApiKey = 'apiKey',
  Session = 'session',
  System = 'system',
}

export type UpdateAccountProjectTagInput = {
  accountId: Scalars['ID']['input'];
  isPrimary: Scalars['Boolean']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateAccountTagInput = {
  accountId: Scalars['ID']['input'];
  isPrimary: Scalars['Boolean']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateGroupTagInput = {
  groupId: Scalars['ID']['input'];
  isPrimary: Scalars['Boolean']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateMyUserAuthenticationMethodInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  provider?: InputMaybe<UserAuthenticationMethodProvider>;
  providerData?: InputMaybe<Scalars['JSON']['input']>;
  providerId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMyUserInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  scope: Scope;
};

export type UpdateOrganizationInvitationInput = {
  acceptedAt?: InputMaybe<Scalars['Date']['input']>;
  expiresAt?: InputMaybe<Scalars['Date']['input']>;
  invitedAt?: InputMaybe<Scalars['Date']['input']>;
  status?: InputMaybe<OrganizationInvitationStatus>;
  token?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationMemberInput = {
  roleId: Scalars['ID']['input'];
  scope: Scope;
};

export type UpdateOrganizationProjectTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateOrganizationTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdatePermissionInput = {
  action?: InputMaybe<Scalars['String']['input']>;
  condition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  resourceId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdatePermissionTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateProjectInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateProjectTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateResourceInput = {
  actions?: InputMaybe<Array<Scalars['String']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  slug?: InputMaybe<Scalars['String']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateResourceTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  resourceId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateRoleTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  roleId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateTagInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  scope: Scope;
};

export type UpdateUserAuthenticationMethodInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  provider?: InputMaybe<UserAuthenticationMethodProvider>;
  providerData?: InputMaybe<Scalars['JSON']['input']>;
  providerId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  pictureUrl?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateUserSessionInput = {
  id: Scalars['ID']['input'];
  ipAddress?: InputMaybe<Scalars['String']['input']>;
  lastUsedAt?: InputMaybe<Scalars['Date']['input']>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  tagId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type UploadMyUserPictureInput = {
  contentType: Scalars['String']['input'];
  file: Scalars['String']['input'];
  filename: Scalars['String']['input'];
};

export type UploadUserPictureInput = {
  contentType: Scalars['String']['input'];
  file: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  scope: Scope;
  userId: Scalars['ID']['input'];
};

export type UploadUserPictureResult = {
  __typename?: 'UploadUserPictureResult';
  path: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type User = Auditable & {
  __typename?: 'User';
  accounts?: Maybe<Array<Account>>;
  authenticationMethods?: Maybe<Array<UserAuthenticationMethod>>;
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  pictureUrl?: Maybe<Scalars['String']['output']>;
  roles?: Maybe<Array<Role>>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export enum UserAuthenticationEmailProviderAction {
  Connect = 'connect',
  Login = 'login',
  Register = 'register',
}

export type UserAuthenticationMethod = Auditable & {
  __typename?: 'UserAuthenticationMethod';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['output'];
  providerId: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export enum UserAuthenticationMethodProvider {
  Email = 'email',
  Github = 'github',
  Google = 'google',
}

export type UserDataExport = {
  __typename?: 'UserDataExport';
  accounts: Array<AccountExportData>;
  authenticationMethods: Array<AuthenticationMethodExportData>;
  exportedAt: Scalars['Date']['output'];
  organizationMemberships: Array<OrganizationMembershipExportData>;
  projectMemberships: Array<ProjectMembershipExportData>;
  sessions: Array<SessionExportData>;
  user: UserExportData;
};

export type UserExportData = {
  __typename?: 'UserExportData';
  createdAt: Scalars['Date']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type UserPage = PaginatedResults & {
  __typename?: 'UserPage';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
  users: Array<User>;
};

export type UserRegistrationData = {
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type UserRole = Auditable & {
  __typename?: 'UserRole';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  role?: Maybe<Role>;
  roleId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type UserRoleRoleArgs = {
  scope: Scope;
};

export type UserRoleUserArgs = {
  scope: Scope;
};

export enum UserSearchableField {
  Name = 'name',
}

export type UserSession = Auditable & {
  __typename?: 'UserSession';
  audience: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  expiresAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  token: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userAgent?: Maybe<Scalars['String']['output']>;
  userAuthenticationMethod?: Maybe<UserAuthenticationMethod>;
  userAuthenticationMethodId: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export type UserSessionPage = PaginatedResults & {
  __typename?: 'UserSessionPage';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
  userSessions: Array<UserSession>;
};

export enum UserSessionSearchableField {
  Audience = 'audience',
  IpAddress = 'ipAddress',
  Token = 'token',
  UserAgent = 'userAgent',
}

export type UserSessionSortInput = {
  field: UserSessionSortableField;
  order: SortOrder;
};

export enum UserSessionSortableField {
  LastUsedAt = 'lastUsedAt',
}

export type UserSortInput = {
  field: UserSortableField;
  order: SortOrder;
};

export enum UserSortableField {
  Name = 'name',
}

export type UserTag = Auditable & {
  __typename?: 'UserTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  tag?: Maybe<Tag>;
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export type UserTagTagArgs = {
  scope: Scope;
};

export type UserTagUserArgs = {
  scope: Scope;
};

export type VerifyEmailInput = {
  token: Scalars['String']['input'];
};

export type VerifyEmailResponse = {
  __typename?: 'VerifyEmailResponse';
  message: Scalars['String']['output'];
  messageKey?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CreateApiKeyMutationVariables = Exact<{
  input: CreateApiKeyInput;
}>;

export type CreateApiKeyMutation = {
  __typename?: 'Mutation';
  createApiKey: {
    __typename?: 'CreateApiKeyResult';
    id: string;
    clientId: string;
    clientSecret: string;
    name?: string | null;
    description?: string | null;
    expiresAt?: Date | null;
    createdAt: Date;
  };
};

export type DeleteApiKeyMutationVariables = Exact<{
  input: DeleteApiKeyInput;
}>;

export type DeleteApiKeyMutation = {
  __typename?: 'Mutation';
  deleteApiKey: {
    __typename?: 'ApiKey';
    id: string;
    clientId: string;
    name?: string | null;
    description?: string | null;
    expiresAt?: Date | null;
    lastUsedAt?: Date | null;
    isRevoked: boolean;
    revokedAt?: Date | null;
    revokedBy?: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  };
};

export type ExchangeApiKeyMutationVariables = Exact<{
  input: ExchangeApiKeyInput;
}>;

export type ExchangeApiKeyMutation = {
  __typename?: 'Mutation';
  exchangeApiKey: { __typename?: 'ExchangeApiKeyResult'; accessToken: string; expiresIn: number };
};

export type GetApiKeysQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ApiKeySortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetApiKeysQuery = {
  __typename?: 'Query';
  apiKeys: {
    __typename?: 'ApiKeyPage';
    totalCount: number;
    hasNextPage: boolean;
    apiKeys: Array<{
      __typename?: 'ApiKey';
      id: string;
      clientId: string;
      name?: string | null;
      description?: string | null;
      expiresAt?: Date | null;
      lastUsedAt?: Date | null;
      isRevoked: boolean;
      revokedAt?: Date | null;
      revokedBy?: string | null;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt?: Date | null;
      role?: { __typename?: 'Role'; id: string; name: string } | null;
      createdByUser?: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
      } | null;
      revokedByUser?: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
      } | null;
    }>;
  };
};

export type RevokeApiKeyMutationVariables = Exact<{
  input: RevokeApiKeyInput;
}>;

export type RevokeApiKeyMutation = {
  __typename?: 'Mutation';
  revokeApiKey: {
    __typename?: 'ApiKey';
    id: string;
    clientId: string;
    name?: string | null;
    description?: string | null;
    expiresAt?: Date | null;
    lastUsedAt?: Date | null;
    isRevoked: boolean;
    revokedAt?: Date | null;
    revokedBy?: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  };
};

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;

export type LoginMutation = {
  __typename?: 'Mutation';
  login: {
    __typename?: 'LoginResponse';
    accessToken: string;
    refreshToken: string;
    requiresEmailVerification?: boolean | null;
    verificationExpiry?: Date | null;
    email?: string | null;
    accounts: Array<{
      __typename?: 'Account';
      id: string;
      type: AccountType;
      owner: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
        updatedAt: Date;
      };
    }>;
  };
};

export type RefreshSessionMutationVariables = Exact<{
  accessToken: Scalars['String']['input'];
  refreshToken: Scalars['String']['input'];
}>;

export type RefreshSessionMutation = {
  __typename?: 'Mutation';
  refreshSession: {
    __typename?: 'RefreshSessionResponse';
    accessToken: string;
    refreshToken: string;
  };
};

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;

export type RegisterMutation = {
  __typename?: 'Mutation';
  register: {
    __typename?: 'CreateAccountResult';
    accessToken: string;
    refreshToken: string;
    requiresEmailVerification?: boolean | null;
    verificationExpiry?: Date | null;
    email?: string | null;
    account: {
      __typename?: 'Account';
      id: string;
      type: AccountType;
      owner: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
        updatedAt: Date;
      };
    };
  };
};

export type RequestPasswordResetMutationVariables = Exact<{
  input: RequestPasswordResetInput;
}>;

export type RequestPasswordResetMutation = {
  __typename?: 'Mutation';
  requestPasswordReset: {
    __typename?: 'RequestPasswordResetResponse';
    success: boolean;
    message: string;
    messageKey: string;
  };
};

export type ResendVerificationMutationVariables = Exact<{
  input: ResendVerificationInput;
}>;

export type ResendVerificationMutation = {
  __typename?: 'Mutation';
  resendVerification: {
    __typename?: 'ResendVerificationResponse';
    success: boolean;
    message: string;
  };
};

export type ResetPasswordMutationVariables = Exact<{
  input: ResetPasswordInput;
}>;

export type ResetPasswordMutation = {
  __typename?: 'Mutation';
  resetPassword: {
    __typename?: 'ResetPasswordResponse';
    success: boolean;
    message: string;
    messageKey: string;
  };
};

export type VerifyEmailMutationVariables = Exact<{
  input: VerifyEmailInput;
}>;

export type VerifyEmailMutation = {
  __typename?: 'Mutation';
  verifyEmail: { __typename?: 'VerifyEmailResponse'; success: boolean; message: string };
};

export type CreateGroupMutationVariables = Exact<{
  input: CreateGroupInput;
}>;

export type CreateGroupMutation = {
  __typename?: 'Mutation';
  createGroup: {
    __typename?: 'Group';
    id: string;
    name: string;
    description?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteGroupMutation = {
  __typename?: 'Mutation';
  deleteGroup: {
    __typename?: 'Group';
    id: string;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetGroupsQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<GroupSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetGroupsQuery = {
  __typename?: 'Query';
  groups: {
    __typename?: 'GroupPage';
    totalCount: number;
    hasNextPage: boolean;
    groups: Array<{
      __typename?: 'Group';
      id: string;
      name: string;
      description?: string | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      permissions?: Array<{
        __typename?: 'Permission';
        id: string;
        name: string;
        action: string;
        tags?: Array<{
          __typename?: 'Tag';
          id: string;
          name: string;
          color: string;
          isPrimary?: boolean | null;
        }> | null;
      }> | null;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdateGroupMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateGroupInput;
}>;

export type UpdateGroupMutation = {
  __typename?: 'Mutation';
  updateGroup: {
    __typename?: 'Group';
    id: string;
    name: string;
    description?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ChangeMyPasswordMutationVariables = Exact<{
  input: ChangeMyPasswordInput;
}>;

export type ChangeMyPasswordMutation = {
  __typename?: 'Mutation';
  changeMyPassword: { __typename?: 'ChangeMyPasswordResult'; success: boolean; message: string };
};

export type CreateMySecondaryAccountMutationVariables = Exact<{ [key: string]: never }>;

export type CreateMySecondaryAccountMutation = {
  __typename?: 'Mutation';
  createMySecondaryAccount: {
    __typename?: 'CreateMySecondaryAccountResult';
    account: {
      __typename?: 'Account';
      id: string;
      type: AccountType;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      owner: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
        updatedAt: Date;
      };
    };
    accounts: Array<{
      __typename?: 'Account';
      id: string;
      type: AccountType;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      owner: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
        updatedAt: Date;
      };
    }>;
  };
};

export type CreateMyUserAuthenticationMethodMutationVariables = Exact<{
  input: CreateMyUserAuthenticationMethodInput;
}>;

export type CreateMyUserAuthenticationMethodMutation = {
  __typename?: 'Mutation';
  createMyUserAuthenticationMethod: {
    __typename?: 'UserAuthenticationMethod';
    id: string;
    userId: string;
    provider: UserAuthenticationMethodProvider;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteMyAccountsMutationVariables = Exact<{
  input: DeleteMyAccountsInput;
}>;

export type DeleteMyAccountsMutation = {
  __typename?: 'Mutation';
  deleteMyAccounts: {
    __typename?: 'User';
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  };
};

export type DeleteMyUserAuthenticationMethodMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type DeleteMyUserAuthenticationMethodMutation = {
  __typename?: 'Mutation';
  deleteMyUserAuthenticationMethod: {
    __typename?: 'UserAuthenticationMethod';
    id: string;
    userId: string;
    provider: UserAuthenticationMethodProvider;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type LogoutMyUserMutationVariables = Exact<{ [key: string]: never }>;

export type LogoutMyUserMutation = {
  __typename?: 'Mutation';
  logoutMyUser: { __typename?: 'LogoutMyUserResponse'; message: string };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
  __typename?: 'Query';
  me: {
    __typename?: 'MeResponse';
    requiresEmailVerification?: boolean | null;
    verificationExpiry?: Date | null;
    email?: string | null;
    accounts: Array<{
      __typename?: 'Account';
      id: string;
      type: AccountType;
      ownerId: string;
      createdAt: Date;
      updatedAt: Date;
      owner: {
        __typename?: 'User';
        id: string;
        name: string;
        pictureUrl?: string | null;
        metadata: Record<string, unknown>;
        createdAt: Date;
        updatedAt: Date;
      };
    }>;
  };
};

export type MyUserAuthenticationMethodsQueryVariables = Exact<{ [key: string]: never }>;

export type MyUserAuthenticationMethodsQuery = {
  __typename?: 'Query';
  myUserAuthenticationMethods: Array<{
    __typename?: 'UserAuthenticationMethod';
    id: string;
    userId: string;
    provider: UserAuthenticationMethodProvider;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export type MyUserDataExportQueryVariables = Exact<{ [key: string]: never }>;

export type MyUserDataExportQuery = {
  __typename?: 'Query';
  myUserDataExport: {
    __typename?: 'UserDataExport';
    exportedAt: Date;
    user: {
      __typename?: 'UserExportData';
      id: string;
      name: string;
      email?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    accounts: Array<{
      __typename?: 'AccountExportData';
      id: string;
      type: AccountType;
      createdAt: Date;
      updatedAt: Date;
    }>;
    authenticationMethods: Array<{
      __typename?: 'AuthenticationMethodExportData';
      provider: string;
      providerId: string;
      isVerified: boolean;
      isPrimary: boolean;
      lastUsedAt?: Date | null;
      createdAt: Date;
    }>;
    sessions: Array<{
      __typename?: 'SessionExportData';
      userAgent?: string | null;
      ipAddress?: string | null;
      lastUsedAt?: Date | null;
      expiresAt: Date;
      createdAt: Date;
    }>;
    organizationMemberships: Array<{
      __typename?: 'OrganizationMembershipExportData';
      organizationId: string;
      organizationName: string;
      role: string;
      joinedAt: Date;
    }>;
    projectMemberships: Array<{
      __typename?: 'ProjectMembershipExportData';
      projectId: string;
      projectName: string;
      role: string;
      joinedAt: Date;
    }>;
  };
};

export type MyUserSessionsQueryVariables = Exact<{
  input: MyUserSessionsInput;
}>;

export type MyUserSessionsQuery = {
  __typename?: 'Query';
  myUserSessions: {
    __typename?: 'UserSessionPage';
    totalCount: number;
    hasNextPage: boolean;
    userSessions: Array<{
      __typename?: 'UserSession';
      id: string;
      userId: string;
      userAuthenticationMethodId: string;
      audience: string;
      expiresAt: Date;
      lastUsedAt?: Date | null;
      userAgent?: string | null;
      ipAddress?: string | null;
      createdAt: Date;
      userAuthenticationMethod?: {
        __typename?: 'UserAuthenticationMethod';
        provider: UserAuthenticationMethodProvider;
        providerId: string;
      } | null;
    }>;
  };
};

export type RevokeMyUserSessionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type RevokeMyUserSessionMutation = {
  __typename?: 'Mutation';
  revokeMyUserSession: {
    __typename?: 'RevokeMyUserSessionResult';
    success: boolean;
    message: string;
  };
};

export type SetMyPrimaryAuthenticationMethodMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type SetMyPrimaryAuthenticationMethodMutation = {
  __typename?: 'Mutation';
  setMyPrimaryAuthenticationMethod: {
    __typename?: 'UserAuthenticationMethod';
    id: string;
    userId: string;
    provider: UserAuthenticationMethodProvider;
    providerId: string;
    isVerified: boolean;
    isPrimary: boolean;
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type UpdateMyUserMutationVariables = Exact<{
  input: UpdateMyUserInput;
}>;

export type UpdateMyUserMutation = {
  __typename?: 'Mutation';
  updateMyUser: {
    __typename?: 'User';
    id: string;
    name: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type UploadMyUserPictureMutationVariables = Exact<{
  input: UploadMyUserPictureInput;
}>;

export type UploadMyUserPictureMutation = {
  __typename?: 'Mutation';
  uploadMyUserPicture: { __typename?: 'UploadUserPictureResult'; url: string; path: string };
};

export type AcceptInvitationMutationVariables = Exact<{
  input: AcceptInvitationInput;
}>;

export type AcceptInvitationMutation = {
  __typename?: 'Mutation';
  acceptInvitation: {
    __typename?: 'AcceptInvitationResult';
    requiresRegistration: boolean;
    isNewUser?: boolean | null;
    user?: { __typename?: 'User'; id: string; name: string; createdAt: Date } | null;
    accounts: Array<{ __typename?: 'Account'; id: string; type: AccountType }>;
    invitation?: {
      __typename?: 'OrganizationInvitation';
      id: string;
      email: string;
      status: OrganizationInvitationStatus;
    } | null;
  };
};

export type GetInvitationQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;

export type GetInvitationQuery = {
  __typename?: 'Query';
  invitation?: {
    __typename?: 'OrganizationInvitation';
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    status: OrganizationInvitationStatus;
    expiresAt: Date;
    invitedBy: string;
    invitedAt: Date;
    createdAt: Date;
    organization: { __typename?: 'Organization'; id: string; name: string; slug: string };
    role: { __typename?: 'Role'; id: string; name: string; description?: string | null };
    inviter: { __typename?: 'User'; id: string; name: string };
  } | null;
};

export type GetOrganizationInvitationsQueryVariables = Exact<{
  scope: Scope;
  status?: InputMaybe<OrganizationInvitationStatus>;
}>;

export type GetOrganizationInvitationsQuery = {
  __typename?: 'Query';
  organizationInvitations: {
    __typename?: 'OrganizationInvitationPage';
    totalCount: number;
    hasNextPage: boolean;
    invitations: Array<{
      __typename?: 'OrganizationInvitation';
      id: string;
      organizationId: string;
      email: string;
      roleId: string;
      status: OrganizationInvitationStatus;
      expiresAt: Date;
      invitedBy: string;
      invitedAt: Date;
      createdAt: Date;
    }>;
  };
};

export type InviteMemberMutationVariables = Exact<{
  input: InviteMemberInput;
}>;

export type InviteMemberMutation = {
  __typename?: 'Mutation';
  inviteMember: {
    __typename?: 'OrganizationInvitation';
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    status: OrganizationInvitationStatus;
    expiresAt: Date;
    invitedBy: string;
    invitedAt: Date;
    createdAt: Date;
  };
};

export type RenewInvitationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type RenewInvitationMutation = {
  __typename?: 'Mutation';
  renewInvitation: {
    __typename?: 'OrganizationInvitation';
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    status: OrganizationInvitationStatus;
    expiresAt: Date;
    invitedBy: string;
    invitedAt: Date;
    createdAt: Date;
  };
};

export type ResendInvitationEmailMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type ResendInvitationEmailMutation = {
  __typename?: 'Mutation';
  resendInvitationEmail: {
    __typename?: 'OrganizationInvitation';
    id: string;
    organizationId: string;
    email: string;
    roleId: string;
    status: OrganizationInvitationStatus;
    expiresAt: Date;
    invitedBy: string;
    invitedAt: Date;
    createdAt: Date;
  };
};

export type RevokeInvitationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type RevokeInvitationMutation = {
  __typename?: 'Mutation';
  revokeInvitation: {
    __typename?: 'OrganizationInvitation';
    id: string;
    email: string;
    status: OrganizationInvitationStatus;
    deletedAt?: Date | null;
  };
};

export type GetOrganizationMembersQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationMemberSortInput>;
  status?: InputMaybe<OrganizationInvitationStatus>;
}>;

export type GetOrganizationMembersQuery = {
  __typename?: 'Query';
  organizationMembers: {
    __typename?: 'OrganizationMemberPage';
    totalCount: number;
    hasNextPage: boolean;
    members: Array<{
      __typename?: 'OrganizationMember';
      id: string;
      name: string;
      email?: string | null;
      type: MemberType;
      status?: OrganizationInvitationStatus | null;
      createdAt: Date;
      role: { __typename?: 'Role'; id: string; name: string; description?: string | null };
      user?: { __typename?: 'User'; id: string; name: string } | null;
      invitation?: {
        __typename?: 'OrganizationInvitation';
        id: string;
        email: string;
        status: OrganizationInvitationStatus;
        expiresAt: Date;
        invitedAt: Date;
        createdAt: Date;
        token: string;
        inviter: { __typename?: 'User'; id: string; name: string };
      } | null;
    }>;
  };
};

export type RemoveOrganizationMemberMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  input: RemoveOrganizationMemberInput;
}>;

export type RemoveOrganizationMemberMutation = {
  __typename?: 'Mutation';
  removeOrganizationMember: {
    __typename?: 'OrganizationMember';
    id: string;
    name: string;
    email?: string | null;
    type: MemberType;
    status?: OrganizationInvitationStatus | null;
    createdAt: Date;
    role: { __typename?: 'Role'; id: string; name: string; description?: string | null };
    user?: { __typename?: 'User'; id: string; name: string } | null;
    invitation?: {
      __typename?: 'OrganizationInvitation';
      id: string;
      email: string;
      status: OrganizationInvitationStatus;
    } | null;
  };
};

export type UpdateOrganizationMemberMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  input: UpdateOrganizationMemberInput;
}>;

export type UpdateOrganizationMemberMutation = {
  __typename?: 'Mutation';
  updateOrganizationMember: {
    __typename?: 'OrganizationMember';
    id: string;
    name: string;
    email?: string | null;
    type: MemberType;
    status?: OrganizationInvitationStatus | null;
    createdAt: Date;
    role: { __typename?: 'Role'; id: string; name: string; description?: string | null };
    user?: { __typename?: 'User'; id: string; name: string } | null;
    invitation?: {
      __typename?: 'OrganizationInvitation';
      id: string;
      email: string;
      status: OrganizationInvitationStatus;
    } | null;
  };
};

export type CreateOrganizationMutationVariables = Exact<{
  input: CreateOrganizationInput;
}>;

export type CreateOrganizationMutation = {
  __typename?: 'Mutation';
  createOrganization: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteOrganizationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteOrganizationMutation = {
  __typename?: 'Mutation';
  deleteOrganization: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetOrganizationsQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<OrganizationSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetOrganizationsQuery = {
  __typename?: 'Query';
  organizations: {
    __typename?: 'OrganizationPage';
    totalCount: number;
    hasNextPage: boolean;
    organizations: Array<{
      __typename?: 'Organization';
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdateOrganizationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
}>;

export type UpdateOrganizationMutation = {
  __typename?: 'Mutation';
  updateOrganization: {
    __typename?: 'Organization';
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type CreatePermissionMutationVariables = Exact<{
  input: CreatePermissionInput;
}>;

export type CreatePermissionMutation = {
  __typename?: 'Mutation';
  createPermission: {
    __typename?: 'Permission';
    id: string;
    name: string;
    action: string;
    description?: string | null;
    resourceId?: string | null;
    condition?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    resource?: { __typename?: 'Resource'; id: string; name: string; slug: string } | null;
  };
};

export type DeletePermissionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeletePermissionMutation = {
  __typename?: 'Mutation';
  deletePermission: {
    __typename?: 'Permission';
    id: string;
    name: string;
    action: string;
    description?: string | null;
    resourceId?: string | null;
    condition?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetPermissionsQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<PermissionSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetPermissionsQuery = {
  __typename?: 'Query';
  permissions: {
    __typename?: 'PermissionPage';
    totalCount: number;
    hasNextPage: boolean;
    permissions: Array<{
      __typename?: 'Permission';
      id: string;
      name: string;
      action: string;
      description?: string | null;
      resourceId?: string | null;
      condition?: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
      resource?: { __typename?: 'Resource'; id: string; name: string; slug: string } | null;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdatePermissionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePermissionInput;
}>;

export type UpdatePermissionMutation = {
  __typename?: 'Mutation';
  updatePermission: {
    __typename?: 'Permission';
    id: string;
    name: string;
    action: string;
    description?: string | null;
    resourceId?: string | null;
    condition?: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    resource?: { __typename?: 'Resource'; id: string; name: string; slug: string } | null;
  };
};

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;

export type CreateProjectMutation = {
  __typename?: 'Mutation';
  createProject: {
    __typename?: 'Project';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteProjectMutation = {
  __typename?: 'Mutation';
  deleteProject: {
    __typename?: 'Project';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetProjectsQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProjectSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetProjectsQuery = {
  __typename?: 'Query';
  projects: {
    __typename?: 'ProjectPage';
    totalCount: number;
    hasNextPage: boolean;
    projects: Array<{
      __typename?: 'Project';
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      createdAt: Date;
      updatedAt: Date;
      organizationTags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
      accountTags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
}>;

export type UpdateProjectMutation = {
  __typename?: 'Mutation';
  updateProject: {
    __typename?: 'Project';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type CreateResourceMutationVariables = Exact<{
  input: CreateResourceInput;
}>;

export type CreateResourceMutation = {
  __typename?: 'Mutation';
  createResource: {
    __typename?: 'Resource';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    actions: Array<string>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteResourceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteResourceMutation = {
  __typename?: 'Mutation';
  deleteResource: {
    __typename?: 'Resource';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    actions: Array<string>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetResourcesQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ResourceSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type GetResourcesQuery = {
  __typename?: 'Query';
  resources: {
    __typename?: 'ResourcePage';
    totalCount: number;
    hasNextPage: boolean;
    resources: Array<{
      __typename?: 'Resource';
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      actions: Array<string>;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      tags: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }>;
    }>;
  };
};

export type UpdateResourceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateResourceInput;
}>;

export type UpdateResourceMutation = {
  __typename?: 'Mutation';
  updateResource: {
    __typename?: 'Resource';
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    actions: Array<string>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type CreateRoleMutationVariables = Exact<{
  input: CreateRoleInput;
}>;

export type CreateRoleMutation = {
  __typename?: 'Mutation';
  createRole: {
    __typename?: 'Role';
    id: string;
    name: string;
    description?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteRoleMutation = {
  __typename?: 'Mutation';
  deleteRole: {
    __typename?: 'Role';
    id: string;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetRolesQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<RoleSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetRolesQuery = {
  __typename?: 'Query';
  roles: {
    __typename?: 'RolePage';
    totalCount: number;
    hasNextPage: boolean;
    roles: Array<{
      __typename?: 'Role';
      id: string;
      name: string;
      description?: string | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      groups?: Array<{
        __typename?: 'Group';
        id: string;
        name: string;
        tags?: Array<{
          __typename?: 'Tag';
          id: string;
          name: string;
          color: string;
          isPrimary?: boolean | null;
        }> | null;
      }> | null;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdateRoleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
}>;

export type UpdateRoleMutation = {
  __typename?: 'Mutation';
  updateRole: {
    __typename?: 'Role';
    id: string;
    name: string;
    description?: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type CreateTagMutationVariables = Exact<{
  input: CreateTagInput;
}>;

export type CreateTagMutation = {
  __typename?: 'Mutation';
  createTag: {
    __typename?: 'Tag';
    id: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteTagMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteTagMutation = {
  __typename?: 'Mutation';
  deleteTag: {
    __typename?: 'Tag';
    id: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type GetTagsQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<TagSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetTagsQuery = {
  __typename?: 'Query';
  tags: {
    __typename?: 'TagPage';
    totalCount: number;
    hasNextPage: boolean;
    tags: Array<{
      __typename?: 'Tag';
      id: string;
      name: string;
      color: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
};

export type UpdateTagMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateTagInput;
}>;

export type UpdateTagMutation = {
  __typename?: 'Mutation';
  updateTag: {
    __typename?: 'Tag';
    id: string;
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;

export type CreateUserMutation = {
  __typename?: 'Mutation';
  createUser: {
    __typename?: 'User';
    id: string;
    name: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  scope: Scope;
}>;

export type DeleteUserMutation = {
  __typename?: 'Mutation';
  deleteUser: { __typename?: 'User'; id: string; name: string; createdAt: Date; updatedAt: Date };
};

export type GetUsersQueryVariables = Exact<{
  scope: Scope;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<UserSortInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;

export type GetUsersQuery = {
  __typename?: 'Query';
  users: {
    __typename?: 'UserPage';
    totalCount: number;
    hasNextPage: boolean;
    users: Array<{
      __typename?: 'User';
      id: string;
      name: string;
      pictureUrl?: string | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
      updatedAt: Date;
      roles?: Array<{
        __typename?: 'Role';
        id: string;
        name: string;
        tags?: Array<{
          __typename?: 'Tag';
          id: string;
          name: string;
          color: string;
          isPrimary?: boolean | null;
        }> | null;
      }> | null;
      tags?: Array<{
        __typename?: 'Tag';
        id: string;
        name: string;
        color: string;
        isPrimary?: boolean | null;
      }> | null;
    }>;
  };
};

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}>;

export type UpdateUserMutation = {
  __typename?: 'Mutation';
  updateUser: {
    __typename?: 'User';
    id: string;
    name: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type UploadUserPictureMutationVariables = Exact<{
  input: UploadUserPictureInput;
}>;

export type UploadUserPictureMutation = {
  __typename?: 'Mutation';
  uploadUserPicture: { __typename?: 'UploadUserPictureResult'; url: string; path: string };
};

export const CreateApiKeyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateApiKey' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateApiKeyInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createApiKey' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'clientId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'clientSecret' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateApiKeyMutation, CreateApiKeyMutationVariables>;
export const DeleteApiKeyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteApiKey' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'DeleteApiKeyInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteApiKey' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'clientId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRevoked' } },
                { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'revokedBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'deletedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteApiKeyMutation, DeleteApiKeyMutationVariables>;
export const ExchangeApiKeyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ExchangeApiKey' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ExchangeApiKeyInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'exchangeApiKey' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresIn' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ExchangeApiKeyMutation, ExchangeApiKeyMutationVariables>;
export const GetApiKeysDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetApiKeys' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ApiKeySortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'apiKeys' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'apiKeys' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'clientId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isRevoked' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'revokedBy' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdBy' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'deletedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'role' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdByUser' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'revokedByUser' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetApiKeysQuery, GetApiKeysQueryVariables>;
export const RevokeApiKeyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RevokeApiKey' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'RevokeApiKeyInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'revokeApiKey' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'clientId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isRevoked' } },
                { kind: 'Field', name: { kind: 'Name', value: 'revokedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'revokedBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'deletedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RevokeApiKeyMutation, RevokeApiKeyMutationVariables>;
export const LoginDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'Login' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'LoginInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'login' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refreshToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'requiresEmailVerification' } },
                { kind: 'Field', name: { kind: 'Name', value: 'verificationExpiry' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'accounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'owner' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RefreshSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RefreshSession' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'accessToken' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'refreshToken' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'refreshSession' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'accessToken' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'accessToken' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'refreshToken' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'refreshToken' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refreshToken' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RefreshSessionMutation, RefreshSessionMutationVariables>;
export const RegisterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'Register' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'RegisterInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'register' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'accessToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'refreshToken' } },
                { kind: 'Field', name: { kind: 'Name', value: 'requiresEmailVerification' } },
                { kind: 'Field', name: { kind: 'Name', value: 'verificationExpiry' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'account' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'owner' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const RequestPasswordResetDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RequestPasswordReset' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'RequestPasswordResetInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'requestPasswordReset' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'messageKey' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RequestPasswordResetMutation, RequestPasswordResetMutationVariables>;
export const ResendVerificationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ResendVerification' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ResendVerificationInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resendVerification' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ResendVerificationMutation, ResendVerificationMutationVariables>;
export const ResetPasswordDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ResetPassword' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ResetPasswordInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resetPassword' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
                { kind: 'Field', name: { kind: 'Name', value: 'messageKey' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const VerifyEmailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'VerifyEmail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'VerifyEmailInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'verifyEmail' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<VerifyEmailMutation, VerifyEmailMutationVariables>;
export const CreateGroupDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateGroup' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateGroupInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createGroup' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateGroupMutation, CreateGroupMutationVariables>;
export const DeleteGroupDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteGroup' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteGroup' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteGroupMutation, DeleteGroupMutationVariables>;
export const GetGroupsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetGroups' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'GroupSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'groups' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'groups' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'permissions' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'action' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tags' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetGroupsQuery, GetGroupsQueryVariables>;
export const UpdateGroupDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateGroup' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateGroupInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateGroup' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateGroupMutation, UpdateGroupMutationVariables>;
export const ChangeMyPasswordDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ChangeMyPassword' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ChangeMyPasswordInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'changeMyPassword' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChangeMyPasswordMutation, ChangeMyPasswordMutationVariables>;
export const CreateMySecondaryAccountDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateMySecondaryAccount' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createMySecondaryAccount' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'account' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ownerId' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'owner' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'accounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ownerId' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'owner' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateMySecondaryAccountMutation,
  CreateMySecondaryAccountMutationVariables
>;
export const CreateMyUserAuthenticationMethodDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateMyUserAuthenticationMethod' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateMyUserAuthenticationMethodInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createMyUserAuthenticationMethod' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  CreateMyUserAuthenticationMethodMutation,
  CreateMyUserAuthenticationMethodMutationVariables
>;
export const DeleteMyAccountsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteMyAccounts' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'DeleteMyAccountsInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteMyAccounts' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'deletedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteMyAccountsMutation, DeleteMyAccountsMutationVariables>;
export const DeleteMyUserAuthenticationMethodDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteMyUserAuthenticationMethod' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteMyUserAuthenticationMethod' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  DeleteMyUserAuthenticationMethodMutation,
  DeleteMyUserAuthenticationMethodMutationVariables
>;
export const LogoutMyUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'LogoutMyUser' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'logoutMyUser' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [{ kind: 'Field', name: { kind: 'Name', value: 'message' } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<LogoutMyUserMutation, LogoutMyUserMutationVariables>;
export const MeDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'Me' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'me' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'accounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ownerId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'owner' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'requiresEmailVerification' } },
                { kind: 'Field', name: { kind: 'Name', value: 'verificationExpiry' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const MyUserAuthenticationMethodsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MyUserAuthenticationMethods' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myUserAuthenticationMethods' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MyUserAuthenticationMethodsQuery,
  MyUserAuthenticationMethodsQueryVariables
>;
export const MyUserDataExportDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MyUserDataExport' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myUserDataExport' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'accounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'authenticationMethods' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isVerified' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'sessions' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'userAgent' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ipAddress' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'organizationMemberships' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'organizationName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'joinedAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'projectMemberships' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'projectId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'projectName' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'joinedAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'exportedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MyUserDataExportQuery, MyUserDataExportQueryVariables>;
export const MyUserSessionsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'MyUserSessions' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'MyUserSessionsInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'myUserSessions' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'userSessions' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'userAuthenticationMethodId' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'userAuthenticationMethod' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'audience' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'userAgent' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'ipAddress' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MyUserSessionsQuery, MyUserSessionsQueryVariables>;
export const RevokeMyUserSessionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RevokeMyUserSession' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'revokeMyUserSession' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'success' } },
                { kind: 'Field', name: { kind: 'Name', value: 'message' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RevokeMyUserSessionMutation, RevokeMyUserSessionMutationVariables>;
export const SetMyPrimaryAuthenticationMethodDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetMyPrimaryAuthenticationMethod' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setMyPrimaryAuthenticationMethod' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'userId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'provider' } },
                { kind: 'Field', name: { kind: 'Name', value: 'providerId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isVerified' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                { kind: 'Field', name: { kind: 'Name', value: 'lastUsedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SetMyPrimaryAuthenticationMethodMutation,
  SetMyPrimaryAuthenticationMethodMutationVariables
>;
export const UpdateMyUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateMyUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateMyUserInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateMyUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateMyUserMutation, UpdateMyUserMutationVariables>;
export const UploadMyUserPictureDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UploadMyUserPicture' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UploadMyUserPictureInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'uploadMyUserPicture' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UploadMyUserPictureMutation, UploadMyUserPictureMutationVariables>;
export const AcceptInvitationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'AcceptInvitation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'AcceptInvitationInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'acceptInvitation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'requiresRegistration' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isNewUser' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'accounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'invitation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<AcceptInvitationMutation, AcceptInvitationMutationVariables>;
export const GetInvitationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetInvitation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'token' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'invitation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'token' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'token' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'organization' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roleId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'role' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedBy' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'inviter' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetInvitationQuery, GetInvitationQueryVariables>;
export const GetOrganizationInvitationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetOrganizationInvitations' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'OrganizationInvitationStatus' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'organizationInvitations' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'status' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'invitations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'roleId' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'invitedBy' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  GetOrganizationInvitationsQuery,
  GetOrganizationInvitationsQueryVariables
>;
export const InviteMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'InviteMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'InviteMemberInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inviteMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roleId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<InviteMemberMutation, InviteMemberMutationVariables>;
export const RenewInvitationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RenewInvitation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'renewInvitation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roleId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RenewInvitationMutation, RenewInvitationMutationVariables>;
export const ResendInvitationEmailDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ResendInvitationEmail' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resendInvitationEmail' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'organizationId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'roleId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedBy' } },
                { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ResendInvitationEmailMutation, ResendInvitationEmailMutationVariables>;
export const RevokeInvitationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RevokeInvitation' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'revokeInvitation' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                { kind: 'Field', name: { kind: 'Name', value: 'deletedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<RevokeInvitationMutation, RevokeInvitationMutationVariables>;
export const GetOrganizationMembersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetOrganizationMembers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'OrganizationMemberSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'OrganizationInvitationStatus' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'organizationMembers' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'status' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'status' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'members' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'role' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'user' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'invitation' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'expiresAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'invitedAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'token' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'inviter' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetOrganizationMembersQuery, GetOrganizationMembersQueryVariables>;
export const RemoveOrganizationMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RemoveOrganizationMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'RemoveOrganizationMemberInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'removeOrganizationMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'role' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'invitation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RemoveOrganizationMemberMutation,
  RemoveOrganizationMemberMutationVariables
>;
export const UpdateOrganizationMemberDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateOrganizationMember' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateOrganizationMemberInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateOrganizationMember' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'userId' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'userId' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'role' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'user' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'invitation' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'email' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'status' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  UpdateOrganizationMemberMutation,
  UpdateOrganizationMemberMutationVariables
>;
export const CreateOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateOrganization' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateOrganizationInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createOrganization' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateOrganizationMutation, CreateOrganizationMutationVariables>;
export const DeleteOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteOrganization' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteOrganization' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteOrganizationMutation, DeleteOrganizationMutationVariables>;
export const GetOrganizationsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetOrganizations' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'OrganizationSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'organizations' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'organizations' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetOrganizationsQuery, GetOrganizationsQueryVariables>;
export const UpdateOrganizationDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateOrganization' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateOrganizationInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateOrganization' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateOrganizationMutation, UpdateOrganizationMutationVariables>;
export const CreatePermissionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreatePermission' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreatePermissionInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createPermission' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'action' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'resourceId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resource' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'condition' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreatePermissionMutation, CreatePermissionMutationVariables>;
export const DeletePermissionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeletePermission' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deletePermission' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'action' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'resourceId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'condition' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeletePermissionMutation, DeletePermissionMutationVariables>;
export const GetPermissionsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetPermissions' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'PermissionSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'permissions' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'permissions' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'action' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'resourceId' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'resource' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'condition' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetPermissionsQuery, GetPermissionsQueryVariables>;
export const UpdatePermissionDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdatePermission' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdatePermissionInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updatePermission' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'action' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'resourceId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resource' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'condition' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdatePermissionMutation, UpdatePermissionMutationVariables>;
export const CreateProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateProject' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateProjectInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createProject' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateProjectMutation, CreateProjectMutationVariables>;
export const DeleteProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteProject' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteProject' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteProjectMutation, DeleteProjectMutationVariables>;
export const GetProjectsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetProjects' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ProjectSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'projects' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'projects' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'organizationTags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'accountTags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectsQuery, GetProjectsQueryVariables>;
export const UpdateProjectDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateProject' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateProjectInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateProject' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateProjectMutation, UpdateProjectMutationVariables>;
export const CreateResourceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateResource' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateResourceInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createResource' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'actions' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateResourceMutation, CreateResourceMutationVariables>;
export const DeleteResourceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteResource' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteResource' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'actions' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteResourceMutation, DeleteResourceMutationVariables>;
export const GetResourcesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetResources' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'ResourceSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'isActive' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resources' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'isActive' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'isActive' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'resources' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'actions' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetResourcesQuery, GetResourcesQueryVariables>;
export const UpdateResourceDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateResource' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateResourceInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateResource' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'slug' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'actions' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateResourceMutation, UpdateResourceMutationVariables>;
export const CreateRoleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateRole' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateRoleInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createRole' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateRoleMutation, CreateRoleMutationVariables>;
export const DeleteRoleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteRole' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteRole' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteRoleMutation, DeleteRoleMutationVariables>;
export const GetRolesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetRoles' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'RoleSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'roles' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'roles' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'groups' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tags' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetRolesQuery, GetRolesQueryVariables>;
export const UpdateRoleDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateRole' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateRoleInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateRole' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateRoleMutation, UpdateRoleMutationVariables>;
export const CreateTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateTagInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateTagMutation, CreateTagMutationVariables>;
export const DeleteTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteTagMutation, DeleteTagMutationVariables>;
export const GetTagsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetTags' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'TagSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'tags' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'tags' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetTagsQuery, GetTagsQueryVariables>;
export const UpdateTagDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateTag' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateTagInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateTag' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateTagMutation, UpdateTagMutationVariables>;
export const CreateUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'CreateUserInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<CreateUserMutation, CreateUserMutationVariables>;
export const DeleteUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<DeleteUserMutation, DeleteUserMutationVariables>;
export const GetUsersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetUsers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'Scope' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'UserSortInput' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'users' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'scope' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'scope' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'page' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'page' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'limit' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'sort' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'sort' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'search' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'search' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'ids' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'tagIds' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'tagIds' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'users' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'pictureUrl' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'roles' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'tags' },
                              selectionSet: {
                                kind: 'SelectionSet',
                                selections: [
                                  { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                                  { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'tags' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'color' } },
                            { kind: 'Field', name: { kind: 'Name', value: 'isPrimary' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'totalCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hasNextPage' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetUsersQuery, GetUsersQueryVariables>;
export const UpdateUserDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateUser' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UpdateUserInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateUser' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'metadata' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
                { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UpdateUserMutation, UpdateUserMutationVariables>;
export const UploadUserPictureDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UploadUserPicture' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'UploadUserPictureInput' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'uploadUserPicture' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: { kind: 'Variable', name: { kind: 'Name', value: 'input' } },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'url' } },
                { kind: 'Field', name: { kind: 'Name', value: 'path' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UploadUserPictureMutation, UploadUserPictureMutationVariables>;
