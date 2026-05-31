export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
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
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddPermissionTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  permissionId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectAppTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  projectAppId: Scalars['ID']['input'];
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
  /** Optional pivot metadata (e.g. CDM `cdmImport` / `cdmSource`); omit for normal API creates. */
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddProjectUserInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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
  ScopeNotGranted = 'SCOPE_NOT_GRANTED',
}

export type AuthorizationResult = {
  __typename?: 'AuthorizationResult';
  authorized: Scalars['Boolean']['output'];
  evaluatedContext?: Maybe<Scalars['JSON']['output']>;
  matchedCondition?: Maybe<Scalars['JSON']['output']>;
  matchedPermission?: Maybe<Permission>;
  reason?: Maybe<AuthorizationReason>;
};

export enum CdmFindBy {
  Email = 'email',
  Id = 'id',
  Key = 'key',
  Name = 'name',
  Slug = 'slug',
}

export enum CdmIfMissing {
  CreateNew = 'createNew',
  Fail = 'fail',
  Skip = 'skip',
}

export type CdmKeyResolverInput = {
  findBy?: InputMaybe<CdmFindBy>;
  ifMissing?: InputMaybe<CdmIfMissing>;
  value: Scalars['String']['input'];
};

export type CdmModeInput = {
  confirmDestructive?: InputMaybe<Scalars['Boolean']['input']>;
  onConflict?: InputMaybe<CdmOnConflict>;
  strategy: CdmModeStrategy;
};

export enum CdmModeStrategy {
  Merge = 'merge',
  Replace = 'replace',
}

export enum CdmOnConflict {
  Fail = 'fail',
  Skip = 'skip',
  Update = 'update',
}

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
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  resourceId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateProjectAppInput = {
  /** Allow new users to sign up when authenticating via this app. Default true. */
  allowSignUp?: InputMaybe<Scalars['Boolean']['input']>;
  /** Auth providers enabled for this app (e.g. github, email). Empty/null = all configured providers. */
  enabledProviders?: InputMaybe<Array<Scalars['String']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  /** Allowed redirect URIs for OAuth callback. At least one required. */
  redirectUris: Array<Scalars['String']['input']>;
  scope: Scope;
  /** Optional OAuth scopes the app may request. */
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Role to assign to users who sign up via this app. Required when allowSignUp is true; must be a role in the project. */
  signUpRoleId?: InputMaybe<Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateProjectAppResult = {
  __typename?: 'CreateProjectAppResult';
  /** Whether new users can sign up when authenticating via this app. */
  allowSignUp?: Maybe<Scalars['Boolean']['output']>;
  clientId: Scalars['String']['output'];
  /** Shown only once at creation. Null for public clients. */
  clientSecret?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Date']['output'];
  /** Auth providers enabled for this app (e.g. github, email). Empty/null = all configured providers. */
  enabledProviders?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  redirectUris: Array<Scalars['String']['output']>;
  /** Role assigned to users who sign up via this app. */
  signUpRoleId?: Maybe<Scalars['ID']['output']>;
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
  createPermissions?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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

export type GenerateMyMfaRecoveryCodesInput = {
  factorId?: InputMaybe<Scalars['ID']['input']>;
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

export type GroupCdmInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  primaryTag?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
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
  mfaVerified?: Maybe<Scalars['Boolean']['output']>;
  refreshToken: Scalars['String']['output'];
  requiresEmailVerification?: Maybe<Scalars['Boolean']['output']>;
  /** When true, the client should complete MFA before expecting full API access (see AUTH_MIN_AAL_AT_LOGIN). */
  requiresMfaStepUp?: Maybe<Scalars['Boolean']['output']>;
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
  mfaVerified?: Maybe<Scalars['Boolean']['output']>;
  requiresEmailVerification?: Maybe<Scalars['Boolean']['output']>;
  verificationExpiry?: Maybe<Scalars['Date']['output']>;
};

export enum MemberType {
  Invitation = 'invitation',
  Member = 'member',
}

export type MfaDevice = {
  __typename?: 'MfaDevice';
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isEnabled: Scalars['Boolean']['output'];
  isPrimary: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Date']['output']>;
  name: Scalars['String']['output'];
};

export type MfaEnrollment = {
  __typename?: 'MfaEnrollment';
  factorId: Scalars['ID']['output'];
  otpAuthUrl: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type MfaRecoveryCodeStatus = {
  __typename?: 'MfaRecoveryCodeStatus';
  activeCount: Scalars['Int']['output'];
  lastGeneratedAt?: Maybe<Scalars['Date']['output']>;
};

export type MfaSetupResponse = {
  __typename?: 'MfaSetupResponse';
  factorId: Scalars['ID']['output'];
  otpAuthUrl: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type MfaVerifyResponse = {
  __typename?: 'MfaVerifyResponse';
  accessToken: Scalars['String']['output'];
  mfaVerified: Scalars['Boolean']['output'];
  refreshToken: Scalars['String']['output'];
};

export type MfaVerifyResult = {
  __typename?: 'MfaVerifyResult';
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  acceptInvitation: AcceptInvitationResult;
  /**
   * Cancel a pending or running project CDM sync job. Cancellation is
   * immediate when the job is still PENDING; if the job is already RUNNING, the
   * cancellation is recorded and the worker stops at the next checkpoint
   * (best-effort).
   */
  cancelProjectSync: ProjectSyncJob;
  changeMyPassword: ChangeMyPasswordResult;
  createApiKey: CreateApiKeyResult;
  createGroup: Group;
  createMyMfaEnrollment: MfaEnrollment;
  createMySecondaryAccount: CreateMySecondaryAccountResult;
  createMyUserAuthenticationMethod: UserAuthenticationMethod;
  createOrganization: Organization;
  createPermission: Permission;
  createProject: Project;
  /** Create an OAuth app for a project. Allows project users to sign in with providers (e.g. GitHub) and receive tokens scoped to the project. */
  createProjectApp: CreateProjectAppResult;
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
  deleteProjectApp: ProjectApp;
  deleteResource: Resource;
  deleteRole: Role;
  deleteTag: Tag;
  deleteUser: User;
  exchangeApiKey: ExchangeApiKeyResult;
  generateMyMfaRecoveryCodes: Array<Scalars['String']['output']>;
  inviteMember: OrganizationInvitation;
  login: LoginResponse;
  logoutMyUser: LogoutMyUserResponse;
  refreshSession: RefreshSessionResponse;
  register: CreateAccountResult;
  removeMyMfaDevice: MfaVerifyResult;
  removeOrganizationMember: OrganizationMember;
  renewInvitation: OrganizationInvitation;
  requestPasswordReset: RequestPasswordResetResponse;
  resendInvitationEmail: OrganizationInvitation;
  resendVerification: ResendVerificationResponse;
  resetPassword: ResetPasswordResponse;
  revokeApiKey: ApiKey;
  revokeInvitation: OrganizationInvitation;
  revokeMyUserSession: RevokeMyUserSessionResult;
  /**
   * Rotate the signing key for the given scope: create a new active key and mark the previous one as rotated.
   * Allowed scopes: accountProject, organizationProject only.
   * Returns the new signing key (public info).
   */
  rotateSigningKey: SigningKey;
  setMyPrimaryAuthenticationMethod: UserAuthenticationMethod;
  setMyPrimaryMfaDevice: MfaDevice;
  setupMfa: MfaSetupResponse;
  /**
   * Enqueue an asynchronous CDM **export** job for the given project. The worker
   * snapshots current permission state into a replay-ready `SyncProjectInput` and
   * stores it on the job row (`snapshot`); poll `projectSyncJob` for status.
   *
   * Requires Project:update in the given project scope (same as starting import jobs).
   *
   * Pass optional `input.jobName` for idempotency with the same rules as import `input.id`.
   */
  startProjectExport: ProjectSyncJob;
  /**
   * Enqueue an asynchronous project CDM import job for the given project.
   * Applies a canonical data model document: roles, groups, resources, permissions,
   * tags, project pivots, and user assignments scoped to the project.
   * Requires Project:update in the given project scope.
   *
   * Returns immediately with a job descriptor in the PENDING status; the actual
   * import runs in the background. Poll `projectSyncJob` for status.
   * Pass optional `input.id` as a stable **job name** for idempotency: if an active job
   * already exists for the same `(project, operation=IMPORT, jobName)`, that job is
   * returned instead of creating a new one.
   */
  startProjectSync: ProjectSyncJob;
  updateGroup: Group;
  updateMyUser: User;
  updateOrganization: Organization;
  updateOrganizationMember: OrganizationMember;
  updatePermission: Permission;
  updateProject: Project;
  /** Update an existing project app (name, redirect URIs, scopes). */
  updateProjectApp: ProjectApp;
  updateResource: Resource;
  updateRole: Role;
  updateTag: Tag;
  updateUser: User;
  uploadMyUserPicture: UploadUserPictureResult;
  uploadUserPicture: UploadUserPictureResult;
  verifyEmail: VerifyEmailResponse;
  verifyMfa: MfaVerifyResponse;
  verifyMfaRecoveryCode: MfaVerifyResponse;
  verifyMyMfaEnrollment: MfaVerifyResult;
};

export type MutationAcceptInvitationArgs = {
  input: AcceptInvitationInput;
};

export type MutationCancelProjectSyncArgs = {
  id: Scalars['ID']['input'];
  jobId: Scalars['ID']['input'];
  scope: Scope;
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

export type MutationCreateProjectAppArgs = {
  input: CreateProjectAppInput;
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

export type MutationDeleteProjectAppArgs = {
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

export type MutationGenerateMyMfaRecoveryCodesArgs = {
  input?: InputMaybe<GenerateMyMfaRecoveryCodesInput>;
};

export type MutationInviteMemberArgs = {
  input: InviteMemberInput;
};

export type MutationLoginArgs = {
  input: LoginInput;
};

export type MutationRegisterArgs = {
  input: RegisterInput;
};

export type MutationRemoveMyMfaDeviceArgs = {
  input: RemoveMyMfaDeviceInput;
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

export type MutationRotateSigningKeyArgs = {
  scope: Scope;
};

export type MutationSetMyPrimaryAuthenticationMethodArgs = {
  id: Scalars['ID']['input'];
};

export type MutationSetMyPrimaryMfaDeviceArgs = {
  input: SetMyPrimaryMfaDeviceInput;
};

export type MutationStartProjectExportArgs = {
  id: Scalars['ID']['input'];
  input: StartProjectExportInput;
  scope: Scope;
};

export type MutationStartProjectSyncArgs = {
  id: Scalars['ID']['input'];
  input: SyncProjectInput;
  scope: Scope;
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

export type MutationUpdateProjectAppArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectAppInput;
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

export type MutationVerifyMfaArgs = {
  input: VerifyMfaInput;
};

export type MutationVerifyMfaRecoveryCodeArgs = {
  input: VerifyMfaRecoveryCodeInput;
};

export type MutationVerifyMyMfaEnrollmentArgs = {
  input: VerifyMyMfaEnrollmentInput;
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
  requireMfaForSensitiveActions: Scalars['Boolean']['output'];
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
  roleId: Scalars['ID']['output'];
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
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  resource?: Maybe<Resource>;
  resourceId?: Maybe<Scalars['ID']['output']>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

/** Custom permission for this project; `resource` is an opaque key in the same document. */
export type PermissionCdmInput = {
  action: Scalars['String']['input'];
  condition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  groups?: InputMaybe<Array<Scalars['String']['input']>>;
  key: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  primaryTag?: InputMaybe<Scalars['String']['input']>;
  resource: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type ProjectApp = Auditable & {
  __typename?: 'ProjectApp';
  /** Whether new users can sign up when authenticating via this app. Default true. */
  allowSignUp?: Maybe<Scalars['Boolean']['output']>;
  clientId: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  /** Auth providers enabled for this app (e.g. github, email). Empty/null = all configured providers. */
  enabledProviders?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  project?: Maybe<Project>;
  projectId: Scalars['ID']['output'];
  redirectUris: Array<Scalars['String']['output']>;
  scopes?: Maybe<Array<Scalars['String']['output']>>;
  /** Resolved role for signUpRoleId (for display). */
  signUpRole?: Maybe<Role>;
  /** Role assigned to users who sign up via this app. Required when allowSignUp is true. */
  signUpRoleId?: Maybe<Scalars['ID']['output']>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export type ProjectAppPage = PaginatedResults & {
  __typename?: 'ProjectAppPage';
  hasNextPage: Scalars['Boolean']['output'];
  projectApps: Array<ProjectApp>;
  totalCount: Scalars['Int']['output'];
};

export enum ProjectAppSearchableField {
  Name = 'name',
}

export type ProjectAppSortInput = {
  field: ProjectAppSortableField;
  order: SortOrder;
};

export enum ProjectAppSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
}

export type ProjectAppTag = Auditable & {
  __typename?: 'ProjectAppTag';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  projectAppId: Scalars['ID']['output'];
  tagId: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
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

/** Asynchronous project CDM import or export job. */
export type ProjectSyncJob = {
  __typename?: 'ProjectSyncJob';
  cancelledAt?: Maybe<Scalars['Date']['output']>;
  cdmVersion: Scalars['Int']['output'];
  completedAt?: Maybe<Scalars['Date']['output']>;
  enqueuedAt: Scalars['Date']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Rollback snapshot (import) or exported CDM (export); REST `.../snapshot`. */
  hasSnapshot: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Client idempotency key from `SyncProjectInput.id` on import. */
  jobName?: Maybe<Scalars['String']['output']>;
  /** Import merge/replace; null for export. */
  modeStrategy?: Maybe<CdmModeStrategy>;
  operation: ProjectSyncJobOperation;
  projectId: Scalars['ID']['output'];
  /** Import counters when completed; null for export (CDM in snapshot download). */
  result?: Maybe<SyncProjectResult>;
  snapshotSizeBytes?: Maybe<Scalars['Int']['output']>;
  snapshotTakenAt?: Maybe<Scalars['Date']['output']>;
  startedAt?: Maybe<Scalars['Date']['output']>;
  status: ProjectSyncJobStatus;
  warnings: Array<Scalars['String']['output']>;
};

/** CDM import or export work for a project (`project_sync_jobs`). */
export enum ProjectSyncJobOperation {
  Export = 'EXPORT',
  Import = 'IMPORT',
}

/** Paginated list of project CDM sync jobs. */
export type ProjectSyncJobPage = PaginatedResults & {
  __typename?: 'ProjectSyncJobPage';
  hasNextPage: Scalars['Boolean']['output'];
  jobs: Array<ProjectSyncJob>;
  totalCount: Scalars['Int']['output'];
};

export type ProjectSyncJobSortInput = {
  field: ProjectSyncJobSortableField;
  order: SortOrder;
};

export enum ProjectSyncJobSortableField {
  CompletedAt = 'completedAt',
  EnqueuedAt = 'enqueuedAt',
  JobName = 'jobName',
  StartedAt = 'startedAt',
  Status = 'status',
}

/** Lifecycle status of an asynchronous project CDM sync job. */
export enum ProjectSyncJobStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
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
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  pictureUrl?: Maybe<Scalars['String']['output']>;
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
  myMfaDevices: Array<MfaDevice>;
  myMfaRecoveryCodeStatus: MfaRecoveryCodeStatus;
  myUserAuthenticationMethods: Array<UserAuthenticationMethod>;
  myUserDataExport: UserDataExport;
  myUserSessions: UserSessionPage;
  organizationInvitations: OrganizationInvitationPage;
  organizationMembers: OrganizationMemberPage;
  organizations: OrganizationPage;
  permissions: PermissionPage;
  /** List OAuth apps for the given project scope. Allowed scopes: accountProject, organizationProject. */
  projectApps: ProjectAppPage;
  /**
   * Read the current state of a project CDM sync job. Use this to poll
   * the lifecycle of a job started via `startProjectSync`.
   */
  projectSyncJob: ProjectSyncJob;
  /**
   * List project CDM sync jobs for a project, with optional pagination,
   * search (matches jobName), status filter, and sort. Use this to populate the
   * job history view. Use `projectSyncJob` to read a single job's
   * current state for polling.
   */
  projectSyncJobs: ProjectSyncJobPage;
  projects: ProjectPage;
  resources: ResourcePage;
  roles: RolePage;
  /**
   * List signing keys for the given scope (current + rotated).
   * Allowed scopes: accountProject, organizationProject only.
   */
  signingKeys: Array<SigningKey>;
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

export type QueryProjectAppsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ProjectAppSortInput>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type QueryProjectSyncJobArgs = {
  id: Scalars['ID']['input'];
  jobId: Scalars['ID']['input'];
  scope: Scope;
};

export type QueryProjectSyncJobsArgs = {
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  scope: Scope;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ProjectSyncJobSortInput>;
  status?: InputMaybe<ProjectSyncJobStatus>;
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

export type QuerySigningKeysArgs = {
  scope: Scope;
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

export type QueryProjectAppTagsInput = {
  projectAppId?: InputMaybe<Scalars['ID']['input']>;
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

export type RemoveMyMfaDeviceInput = {
  factorId: Scalars['ID']['input'];
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

export type RemoveProjectAppTagInput = {
  projectAppId: Scalars['ID']['input'];
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
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
  slug: Scalars['String']['output'];
  tags: Array<Tag>;
  updatedAt: Scalars['Date']['output'];
};

/** Project resource row for CDM import/export. */
export type ResourceCdmInput = {
  actions: Array<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  primaryTag?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type RoleCdmInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groups?: InputMaybe<Array<Scalars['String']['input']>>;
  key: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  primaryTag?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type SetMyPrimaryMfaDeviceInput = {
  factorId: Scalars['ID']['input'];
};

/**
 * Signing key for a scope (e.g. project). Used for RS256 API key tokens; public key is exposed in JWKS.
 * Only project scopes (accountProject, organizationProject) have manageable keys; system key is internal.
 */
export type SigningKey = Auditable & {
  __typename?: 'SigningKey';
  /** Whether this key is currently used for signing new tokens. */
  active: Scalars['Boolean']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** Key ID used in JWT header and JWKS. */
  kid: Scalars['String']['output'];
  /** Public key PEM for JWKS / verification (optional in response for display or copy). */
  publicKeyPem?: Maybe<Scalars['String']['output']>;
  /** Set when the key was rotated (replaced by a new key); key remains in JWKS until existing tokens expire. */
  rotatedAt?: Maybe<Scalars['Date']['output']>;
  updatedAt: Scalars['Date']['output'];
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

/**
 * Parameters for enqueueing an asynchronous CDM **export** job. The worker
 * materialises a `SyncProjectInput` document and stores it in the job `snapshot`
 * column; this input is persisted as the job `payload` (export options only).
 */
export type StartProjectExportInput = {
  /**
   * When `users` are exported, whether to emit CDM-managed project user API key rows
   * (identity only). Omit = default true (full export behaviour).
   */
  includeUserApiKeys?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Optional stable idempotency / display name (same column as import `SyncProjectInput.id`).
   * When set, an active job for the same `(project, operation=EXPORT, jobName)` is returned
   * instead of creating a new one.
   */
  jobName?: InputMaybe<Scalars['String']['input']>;
  /**
   * Embedded in the exported CDM document `mode` block for re-import.
   * Does not change export execution (snapshot is always read-only).
   */
  mode?: InputMaybe<CdmModeInput>;
  /** Subset of CDM slices to export; omit or empty for a full project export. */
  sections?: InputMaybe<Array<Scalars['String']['input']>>;
  /** CDM document version (only `1` is supported). */
  version: Scalars['Int']['input'];
};

/**
 * Versioned canonical project document (CDM) for export/import: roles, users,
 * resources, permissions, groups, and tags scoped to one project.
 */
export type SyncProjectInput = {
  groups?: InputMaybe<Array<GroupCdmInput>>;
  id?: InputMaybe<Scalars['String']['input']>;
  mode: CdmModeInput;
  permissions?: InputMaybe<Array<PermissionCdmInput>>;
  resources?: InputMaybe<Array<ResourceCdmInput>>;
  roles: Array<RoleCdmInput>;
  tags?: InputMaybe<Array<TagCdmInput>>;
  users: Array<UserCdmInput>;
  version: Scalars['Int']['input'];
};

/** Counters and warnings from a completed CDM import. */
export type SyncProjectResult = {
  __typename?: 'SyncProjectResult';
  groupPermissionsLinked: Scalars['Int']['output'];
  groupTagsLinked: Scalars['Int']['output'];
  groupsCreated: Scalars['Int']['output'];
  importId?: Maybe<Scalars['String']['output']>;
  permissionsCreated: Scalars['Int']['output'];
  projectGroupsLinked: Scalars['Int']['output'];
  projectId: Scalars['ID']['output'];
  projectPermissionsLinked: Scalars['Int']['output'];
  projectResourcesLinked: Scalars['Int']['output'];
  projectRolesLinked: Scalars['Int']['output'];
  projectTagsLinked: Scalars['Int']['output'];
  projectUserApiKeysCreated: Scalars['Int']['output'];
  projectUsersEnsured: Scalars['Int']['output'];
  resourcesCreated: Scalars['Int']['output'];
  roleGroupsLinked: Scalars['Int']['output'];
  roleTagsLinked: Scalars['Int']['output'];
  rolesCreated: Scalars['Int']['output'];
  tagsCreated: Scalars['Int']['output'];
  userRolesAssigned: Scalars['Int']['output'];
  userTagsLinked: Scalars['Int']['output'];
  usersCreated: Scalars['Int']['output'];
  warnings: Array<Scalars['String']['output']>;
};

export type Tag = Auditable & {
  __typename?: 'Tag';
  color: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isPrimary?: Maybe<Scalars['Boolean']['output']>;
  metadata: Scalars['JSON']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type TagCdmInput = {
  color: Scalars['String']['input'];
  key: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
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
  ProjectApp = 'projectApp',
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
  requireMfaForSensitiveActions?: InputMaybe<Scalars['Boolean']['input']>;
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
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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

export type UpdateProjectAppInput = {
  /** Allow new users to sign up when authenticating via this app. */
  allowSignUp?: InputMaybe<Scalars['Boolean']['input']>;
  /** Auth providers enabled for this app (e.g. github, email). Empty/null = all configured providers. */
  enabledProviders?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Display name for the app. */
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  /** Allowed redirect URIs for OAuth callback. If provided, at least one required. */
  redirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
  scope: Scope;
  /** Optional OAuth scopes the app may request. */
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Role to assign to users who sign up via this app. Required when allowSignUp is true; must be a role in the project. */
  signUpRoleId?: InputMaybe<Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateProjectAppTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  projectAppId: Scalars['ID']['input'];
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
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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
  metadata?: InputMaybe<Scalars['JSON']['input']>;
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

export type UserApiKeyCdmInput = {
  clientId?: InputMaybe<Scalars['String']['input']>;
  clientSecret?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['Date']['input']>;
  key?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
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

export type UserCdmInput = {
  apiKeys?: InputMaybe<Array<UserApiKeyCdmInput>>;
  groups?: InputMaybe<Array<Scalars['String']['input']>>;
  key: CdmKeyResolverInput;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  name: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  primaryTag?: InputMaybe<Scalars['String']['input']>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

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

export type VerifyMfaInput = {
  code: Scalars['String']['input'];
};

export type VerifyMfaRecoveryCodeInput = {
  code: Scalars['String']['input'];
};

export type VerifyMyMfaEnrollmentInput = {
  code: Scalars['String']['input'];
};
