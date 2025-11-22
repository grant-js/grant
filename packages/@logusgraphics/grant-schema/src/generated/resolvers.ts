import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
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
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
  name: Scalars['String']['output'];
  owner: User;
  ownerId: Scalars['ID']['output'];
  projects?: Maybe<Array<Project>>;
  slug: Scalars['String']['output'];
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

export enum AccountSearchableField {
  Name = 'name',
  Slug = 'slug',
}

export type AccountSortInput = {
  field: AccountSortableField;
  order: SortOrder;
};

export enum AccountSortableField {
  CreatedAt = 'createdAt',
  Name = 'name',
  Slug = 'slug',
  Type = 'type',
  UpdatedAt = 'updatedAt',
}

export enum AccountType {
  Organization = 'organization',
  Personal = 'personal',
}

export type AddAccountProjectInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
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

export type AddOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
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

export type AddProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type AddProjectTagInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type AddProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
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

export type Auditable = {
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type ChangePasswordInput = {
  confirmPassword: Scalars['String']['input'];
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type ChangePasswordResult = {
  __typename?: 'ChangePasswordResult';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Creatable = {
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CreateAccountInput = {
  name: Scalars['String']['input'];
  ownerId: Scalars['String']['input'];
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
  type: AccountType;
  username?: InputMaybe<Scalars['String']['input']>;
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

export type CreateComplementaryAccountInput = {
  name: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
};

export type CreateComplementaryAccountResult = {
  __typename?: 'CreateComplementaryAccountResult';
  account: Account;
  accounts: Array<Account>;
};

export type CreateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  permissionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
};

export type CreatePermissionInput = {
  action: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
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

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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
  name: Scalars['String']['input'];
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  scope: Scope;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateUserSessionInput = {
  audience: Scalars['String']['input'];
  expiresAt: Scalars['Date']['input'];
  ipAddress?: InputMaybe<Scalars['String']['input']>;
  lastUsedAt: Scalars['Date']['input'];
  token: Scalars['String']['input'];
  userAgent?: InputMaybe<Scalars['String']['input']>;
  userAuthenticationMethodId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type DeleteUserAuthenticationMethodInput = {
  __typename?: 'DeleteUserAuthenticationMethodInput';
  id: Scalars['ID']['output'];
};

export type DeleteUserSessionInput = {
  id: Scalars['ID']['input'];
};

export type GetUserAuthenticationMethodsInput = {
  provider?: InputMaybe<UserAuthenticationMethodProvider>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type GetUserSessionsInput = {
  audience?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  requestedFields?: InputMaybe<Array<Scalars['String']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<UserSessionSortInput>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Group = Auditable & {
  __typename?: 'Group';
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
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
  organizationId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
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

export enum MemberType {
  Invitation = 'invitation',
  Member = 'member',
}

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  acceptInvitation: AcceptInvitationResult;
  changePassword: ChangePasswordResult;
  createComplementaryAccount: CreateComplementaryAccountResult;
  createGroup: Group;
  createOrganization: Organization;
  createPermission: Permission;
  createProject: Project;
  createRole: Role;
  createTag: Tag;
  createUser: User;
  deleteAccount: Account;
  deleteGroup: Group;
  deleteOrganization: Organization;
  deletePermission: Permission;
  deleteProject: Project;
  deleteRole: Role;
  deleteTag: Tag;
  deleteUser: User;
  inviteMember: OrganizationInvitation;
  login: LoginResponse;
  refreshSession: RefreshSessionResponse;
  register: CreateAccountResult;
  removeOrganizationMember: OrganizationMember;
  requestPasswordReset: RequestPasswordResetResponse;
  resendInvitationEmail: OrganizationInvitation;
  resendVerification: ResendVerificationResponse;
  resetPassword: ResetPasswordResponse;
  revokeInvitation: OrganizationInvitation;
  revokeUserSession: RevokeUserSessionResult;
  updateAccount: Account;
  updateGroup: Group;
  updateOrganization: Organization;
  updateOrganizationMember: OrganizationMember;
  updatePermission: Permission;
  updateProject: Project;
  updateRole: Role;
  updateTag: Tag;
  updateUser: User;
  uploadUserPicture: UploadUserPictureResult;
  verifyEmail: VerifyEmailResponse;
};

export type MutationAcceptInvitationArgs = {
  input: AcceptInvitationInput;
};

export type MutationChangePasswordArgs = {
  input: ChangePasswordInput;
};

export type MutationCreateComplementaryAccountArgs = {
  input: CreateComplementaryAccountInput;
};

export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
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

export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};

export type MutationCreateTagArgs = {
  input: CreateTagInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationDeleteAccountArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeleteGroupArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteOrganizationArgs = {
  id: Scalars['ID']['input'];
};

export type MutationDeletePermissionArgs = {
  id: Scalars['ID']['input'];
  scope: Scope;
};

export type MutationDeleteProjectArgs = {
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
};

export type MutationRequestPasswordResetArgs = {
  input: RequestPasswordResetInput;
};

export type MutationResendInvitationEmailArgs = {
  id: Scalars['ID']['input'];
};

export type MutationResendVerificationArgs = {
  input: ResendVerificationInput;
};

export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};

export type MutationRevokeInvitationArgs = {
  id: Scalars['ID']['input'];
};

export type MutationRevokeUserSessionArgs = {
  id: Scalars['ID']['input'];
};

export type MutationUpdateAccountArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAccountInput;
};

export type MutationUpdateGroupArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGroupInput;
};

export type MutationUpdateOrganizationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrganizationInput;
};

export type MutationUpdateOrganizationMemberArgs = {
  input: UpdateOrganizationMemberInput;
  organizationId: Scalars['ID']['input'];
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

export type MutationUploadUserPictureArgs = {
  input: UploadUserPictureInput;
};

export type MutationVerifyEmailArgs = {
  input: VerifyEmailInput;
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
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
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
  createdAt: Scalars['Date']['output'];
  deletedAt?: Maybe<Scalars['Date']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  groups?: Maybe<Array<Group>>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  permissions?: Maybe<Array<Permission>>;
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

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  accounts: AccountPage;
  checkUsername: UsernameAvailability;
  groups: GroupPage;
  invitation?: Maybe<OrganizationInvitation>;
  organizationInvitations: OrganizationInvitationPage;
  organizationMembers: OrganizationMemberPage;
  organizations: OrganizationPage;
  permissions: PermissionPage;
  projects: ProjectPage;
  roles: RolePage;
  tags: TagPage;
  userAuthenticationMethods: Array<UserAuthenticationMethod>;
  userSessions: UserSessionPage;
  users: UserPage;
};

export type QueryAccountsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<AccountSortInput>;
};

export type QueryCheckUsernameArgs = {
  username: Scalars['String']['input'];
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

export type QueryOrganizationInvitationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  organizationId: Scalars['ID']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationInvitationSortInput>;
  status?: InputMaybe<OrganizationInvitationStatus>;
};

export type QueryOrganizationMembersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  organizationId: Scalars['ID']['input'];
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<OrganizationMemberSortInput>;
  status?: InputMaybe<OrganizationInvitationStatus>;
};

export type QueryOrganizationsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
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

export type QueryUserAuthenticationMethodsArgs = {
  input: GetUserAuthenticationMethodsInput;
};

export type QueryUserSessionsArgs = {
  input: GetUserSessionsInput;
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

export type RefreshSessionResponse = {
  __typename?: 'RefreshSessionResponse';
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type RegisterInput = {
  name: Scalars['String']['input'];
  provider: UserAuthenticationMethodProvider;
  providerData: Scalars['JSON']['input'];
  providerId: Scalars['String']['input'];
  type: AccountType;
  username?: InputMaybe<Scalars['String']['input']>;
};

export type RemoveAccountProjectInput = {
  accountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
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
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type RemoveOrganizationPermissionInput = {
  organizationId: Scalars['ID']['input'];
  permissionId: Scalars['ID']['input'];
};

export type RemoveOrganizationProjectInput = {
  organizationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
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

export type RemoveProjectRoleInput = {
  projectId: Scalars['ID']['input'];
  roleId: Scalars['ID']['input'];
};

export type RemoveProjectTagInput = {
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type RemoveProjectUserInput = {
  projectId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
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

export type RevokeUserSessionResult = {
  __typename?: 'RevokeUserSessionResult';
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
  Organization = 'organization',
  Project = 'project',
}

export type UpdateAccountInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateGroupTagInput = {
  groupId: Scalars['ID']['input'];
  isPrimary: Scalars['Boolean']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateOrganizationInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationMemberInput = {
  roleId: Scalars['ID']['input'];
};

export type UpdateOrganizationTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  organizationId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdatePermissionInput = {
  action?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
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
  tagIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateProjectTagInput = {
  isPrimary: Scalars['Boolean']['input'];
  projectId: Scalars['ID']['input'];
  tagId: Scalars['ID']['input'];
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  groupIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
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
};

export type UpdateUserAuthenticationMethodInput = {
  id: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  provider?: InputMaybe<UserAuthenticationMethodProvider>;
  providerData?: InputMaybe<Scalars['JSON']['input']>;
  providerId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  pictureUrl?: InputMaybe<Scalars['String']['input']>;
  primaryTagId?: InputMaybe<Scalars['ID']['input']>;
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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

export type UploadUserPictureInput = {
  contentType: Scalars['String']['input'];
  file: Scalars['String']['input'];
  filename: Scalars['String']['input'];
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
  name: Scalars['String']['output'];
  pictureUrl?: Maybe<Scalars['String']['output']>;
  roles?: Maybe<Array<Role>>;
  tags?: Maybe<Array<Tag>>;
  updatedAt: Scalars['Date']['output'];
};

export enum UserAuthenticationEmailProviderAction {
  Login = 'login',
  Signup = 'signup',
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
  Token = 'token',
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

export type UsernameAvailability = {
  __typename?: 'UsernameAvailability';
  available: Scalars['Boolean']['output'];
  username: Scalars['String']['output'];
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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Auditable:
    | Account
    | AccountProject
    | Group
    | GroupPermission
    | GroupTag
    | Organization
    | OrganizationGroup
    | OrganizationInvitation
    | OrganizationPermission
    | OrganizationProject
    | OrganizationRole
    | OrganizationTag
    | OrganizationUser
    | Permission
    | PermissionTag
    | Project
    | ProjectGroup
    | ProjectPermission
    | ProjectRole
    | ProjectTag
    | ProjectUser
    | Role
    | RoleGroup
    | RoleTag
    | Tag
    | User
    | UserAuthenticationMethod
    | UserRole
    | UserSession
    | UserTag;
  Creatable: never;
  PaginatedResults:
    | AccountPage
    | GroupPage
    | OrganizationPage
    | PermissionPage
    | ProjectPage
    | RolePage
    | TagPage
    | UserPage
    | UserSessionPage;
  Searchable: never;
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AcceptInvitationInput: AcceptInvitationInput;
  AcceptInvitationResult: ResolverTypeWrapper<AcceptInvitationResult>;
  Account: ResolverTypeWrapper<Account>;
  AccountPage: ResolverTypeWrapper<AccountPage>;
  AccountProject: ResolverTypeWrapper<AccountProject>;
  AccountSearchableField: AccountSearchableField;
  AccountSortInput: AccountSortInput;
  AccountSortableField: AccountSortableField;
  AccountType: AccountType;
  AddAccountProjectInput: AddAccountProjectInput;
  AddGroupPermissionInput: AddGroupPermissionInput;
  AddGroupTagInput: AddGroupTagInput;
  AddOrganizationGroupInput: AddOrganizationGroupInput;
  AddOrganizationPermissionInput: AddOrganizationPermissionInput;
  AddOrganizationProjectInput: AddOrganizationProjectInput;
  AddOrganizationRoleInput: AddOrganizationRoleInput;
  AddOrganizationTagInput: AddOrganizationTagInput;
  AddOrganizationUserInput: AddOrganizationUserInput;
  AddPermissionTagInput: AddPermissionTagInput;
  AddProjectGroupInput: AddProjectGroupInput;
  AddProjectPermissionInput: AddProjectPermissionInput;
  AddProjectRoleInput: AddProjectRoleInput;
  AddProjectTagInput: AddProjectTagInput;
  AddProjectUserInput: AddProjectUserInput;
  AddRoleGroupInput: AddRoleGroupInput;
  AddRoleTagInput: AddRoleTagInput;
  AddUserRoleInput: AddUserRoleInput;
  AddUserTagInput: AddUserTagInput;
  Auditable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Auditable']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ChangePasswordInput: ChangePasswordInput;
  ChangePasswordResult: ResolverTypeWrapper<ChangePasswordResult>;
  Creatable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Creatable']>;
  CreateAccountInput: CreateAccountInput;
  CreateAccountResult: ResolverTypeWrapper<CreateAccountResult>;
  CreateComplementaryAccountInput: CreateComplementaryAccountInput;
  CreateComplementaryAccountResult: ResolverTypeWrapper<CreateComplementaryAccountResult>;
  CreateGroupInput: CreateGroupInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePermissionInput: CreatePermissionInput;
  CreateProjectInput: CreateProjectInput;
  CreateRoleInput: CreateRoleInput;
  CreateTagInput: CreateTagInput;
  CreateUserAuthenticationMethodInput: CreateUserAuthenticationMethodInput;
  CreateUserInput: CreateUserInput;
  CreateUserSessionInput: CreateUserSessionInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DeleteUserAuthenticationMethodInput: ResolverTypeWrapper<DeleteUserAuthenticationMethodInput>;
  DeleteUserSessionInput: DeleteUserSessionInput;
  GetUserAuthenticationMethodsInput: GetUserAuthenticationMethodsInput;
  GetUserSessionsInput: GetUserSessionsInput;
  Group: ResolverTypeWrapper<Group>;
  GroupPage: ResolverTypeWrapper<GroupPage>;
  GroupPermission: ResolverTypeWrapper<GroupPermission>;
  GroupSearchableField: GroupSearchableField;
  GroupSortInput: GroupSortInput;
  GroupSortableField: GroupSortableField;
  GroupTag: ResolverTypeWrapper<GroupTag>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InviteMemberInput: InviteMemberInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LoginInput: LoginInput;
  LoginResponse: ResolverTypeWrapper<LoginResponse>;
  MemberType: MemberType;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationGroup: ResolverTypeWrapper<OrganizationGroup>;
  OrganizationInvitation: ResolverTypeWrapper<OrganizationInvitation>;
  OrganizationInvitationPage: ResolverTypeWrapper<OrganizationInvitationPage>;
  OrganizationInvitationSearchableField: OrganizationInvitationSearchableField;
  OrganizationInvitationSortInput: OrganizationInvitationSortInput;
  OrganizationInvitationSortableField: OrganizationInvitationSortableField;
  OrganizationInvitationStatus: OrganizationInvitationStatus;
  OrganizationMember: ResolverTypeWrapper<OrganizationMember>;
  OrganizationMemberPage: ResolverTypeWrapper<OrganizationMemberPage>;
  OrganizationMemberSearchableField: OrganizationMemberSearchableField;
  OrganizationMemberSortInput: OrganizationMemberSortInput;
  OrganizationMemberSortableField: OrganizationMemberSortableField;
  OrganizationPage: ResolverTypeWrapper<OrganizationPage>;
  OrganizationPermission: ResolverTypeWrapper<OrganizationPermission>;
  OrganizationProject: ResolverTypeWrapper<OrganizationProject>;
  OrganizationRole: ResolverTypeWrapper<OrganizationRole>;
  OrganizationSearchableField: OrganizationSearchableField;
  OrganizationSortInput: OrganizationSortInput;
  OrganizationSortableField: OrganizationSortableField;
  OrganizationTag: ResolverTypeWrapper<OrganizationTag>;
  OrganizationUser: ResolverTypeWrapper<OrganizationUser>;
  PaginatedResults: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['PaginatedResults']
  >;
  Permission: ResolverTypeWrapper<Permission>;
  PermissionPage: ResolverTypeWrapper<PermissionPage>;
  PermissionSearchableField: PermissionSearchableField;
  PermissionSortInput: PermissionSortInput;
  PermissionSortableField: PermissionSortableField;
  PermissionTag: ResolverTypeWrapper<PermissionTag>;
  Project: ResolverTypeWrapper<Project>;
  ProjectGroup: ResolverTypeWrapper<ProjectGroup>;
  ProjectPage: ResolverTypeWrapper<ProjectPage>;
  ProjectPermission: ResolverTypeWrapper<ProjectPermission>;
  ProjectRole: ResolverTypeWrapper<ProjectRole>;
  ProjectSearchableField: ProjectSearchableField;
  ProjectSortInput: ProjectSortInput;
  ProjectSortableField: ProjectSortableField;
  ProjectTag: ResolverTypeWrapper<ProjectTag>;
  ProjectUser: ResolverTypeWrapper<ProjectUser>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RefreshSessionResponse: ResolverTypeWrapper<RefreshSessionResponse>;
  RegisterInput: RegisterInput;
  RemoveAccountProjectInput: RemoveAccountProjectInput;
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemoveOrganizationGroupInput: RemoveOrganizationGroupInput;
  RemoveOrganizationMemberInput: RemoveOrganizationMemberInput;
  RemoveOrganizationPermissionInput: RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectInput: RemoveOrganizationProjectInput;
  RemoveOrganizationRoleInput: RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: RemoveOrganizationUserInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
  RemoveProjectGroupInput: RemoveProjectGroupInput;
  RemoveProjectPermissionInput: RemoveProjectPermissionInput;
  RemoveProjectRoleInput: RemoveProjectRoleInput;
  RemoveProjectTagInput: RemoveProjectTagInput;
  RemoveProjectUserInput: RemoveProjectUserInput;
  RemoveRoleGroupInput: RemoveRoleGroupInput;
  RemoveRoleTagInput: RemoveRoleTagInput;
  RemoveUserRoleInput: RemoveUserRoleInput;
  RemoveUserTagInput: RemoveUserTagInput;
  RequestPasswordResetInput: RequestPasswordResetInput;
  RequestPasswordResetResponse: ResolverTypeWrapper<RequestPasswordResetResponse>;
  ResendVerificationInput: ResendVerificationInput;
  ResendVerificationResponse: ResolverTypeWrapper<ResendVerificationResponse>;
  ResetPasswordInput: ResetPasswordInput;
  ResetPasswordResponse: ResolverTypeWrapper<ResetPasswordResponse>;
  RevokeUserSessionResult: ResolverTypeWrapper<RevokeUserSessionResult>;
  Role: ResolverTypeWrapper<Role>;
  RoleGroup: ResolverTypeWrapper<RoleGroup>;
  RolePage: ResolverTypeWrapper<RolePage>;
  RoleSearchableField: RoleSearchableField;
  RoleSortInput: RoleSortInput;
  RoleSortableField: RoleSortableField;
  RoleTag: ResolverTypeWrapper<RoleTag>;
  Scope: Scope;
  Searchable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Searchable']>;
  SortOrder: SortOrder;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<Tag>;
  TagPage: ResolverTypeWrapper<TagPage>;
  TagSearchableField: TagSearchableField;
  TagSortField: TagSortField;
  TagSortInput: TagSortInput;
  Tenant: Tenant;
  UpdateAccountInput: UpdateAccountInput;
  UpdateGroupInput: UpdateGroupInput;
  UpdateGroupTagInput: UpdateGroupTagInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationMemberInput: UpdateOrganizationMemberInput;
  UpdateOrganizationTagInput: UpdateOrganizationTagInput;
  UpdatePermissionInput: UpdatePermissionInput;
  UpdatePermissionTagInput: UpdatePermissionTagInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateProjectTagInput: UpdateProjectTagInput;
  UpdateRoleInput: UpdateRoleInput;
  UpdateRoleTagInput: UpdateRoleTagInput;
  UpdateTagInput: UpdateTagInput;
  UpdateUserAuthenticationMethodInput: UpdateUserAuthenticationMethodInput;
  UpdateUserInput: UpdateUserInput;
  UpdateUserSessionInput: UpdateUserSessionInput;
  UpdateUserTagInput: UpdateUserTagInput;
  UploadUserPictureInput: UploadUserPictureInput;
  UploadUserPictureResult: ResolverTypeWrapper<UploadUserPictureResult>;
  User: ResolverTypeWrapper<User>;
  UserAuthenticationEmailProviderAction: UserAuthenticationEmailProviderAction;
  UserAuthenticationMethod: ResolverTypeWrapper<UserAuthenticationMethod>;
  UserAuthenticationMethodProvider: UserAuthenticationMethodProvider;
  UserPage: ResolverTypeWrapper<UserPage>;
  UserRegistrationData: UserRegistrationData;
  UserRole: ResolverTypeWrapper<UserRole>;
  UserSearchableField: UserSearchableField;
  UserSession: ResolverTypeWrapper<UserSession>;
  UserSessionPage: ResolverTypeWrapper<UserSessionPage>;
  UserSessionSearchableField: UserSessionSearchableField;
  UserSessionSortInput: UserSessionSortInput;
  UserSessionSortableField: UserSessionSortableField;
  UserSortInput: UserSortInput;
  UserSortableField: UserSortableField;
  UserTag: ResolverTypeWrapper<UserTag>;
  UsernameAvailability: ResolverTypeWrapper<UsernameAvailability>;
  VerifyEmailInput: VerifyEmailInput;
  VerifyEmailResponse: ResolverTypeWrapper<VerifyEmailResponse>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptInvitationInput: AcceptInvitationInput;
  AcceptInvitationResult: AcceptInvitationResult;
  Account: Account;
  AccountPage: AccountPage;
  AccountProject: AccountProject;
  AccountSortInput: AccountSortInput;
  AddAccountProjectInput: AddAccountProjectInput;
  AddGroupPermissionInput: AddGroupPermissionInput;
  AddGroupTagInput: AddGroupTagInput;
  AddOrganizationGroupInput: AddOrganizationGroupInput;
  AddOrganizationPermissionInput: AddOrganizationPermissionInput;
  AddOrganizationProjectInput: AddOrganizationProjectInput;
  AddOrganizationRoleInput: AddOrganizationRoleInput;
  AddOrganizationTagInput: AddOrganizationTagInput;
  AddOrganizationUserInput: AddOrganizationUserInput;
  AddPermissionTagInput: AddPermissionTagInput;
  AddProjectGroupInput: AddProjectGroupInput;
  AddProjectPermissionInput: AddProjectPermissionInput;
  AddProjectRoleInput: AddProjectRoleInput;
  AddProjectTagInput: AddProjectTagInput;
  AddProjectUserInput: AddProjectUserInput;
  AddRoleGroupInput: AddRoleGroupInput;
  AddRoleTagInput: AddRoleTagInput;
  AddUserRoleInput: AddUserRoleInput;
  AddUserTagInput: AddUserTagInput;
  Auditable: ResolversInterfaceTypes<ResolversParentTypes>['Auditable'];
  Boolean: Scalars['Boolean']['output'];
  ChangePasswordInput: ChangePasswordInput;
  ChangePasswordResult: ChangePasswordResult;
  Creatable: ResolversInterfaceTypes<ResolversParentTypes>['Creatable'];
  CreateAccountInput: CreateAccountInput;
  CreateAccountResult: CreateAccountResult;
  CreateComplementaryAccountInput: CreateComplementaryAccountInput;
  CreateComplementaryAccountResult: CreateComplementaryAccountResult;
  CreateGroupInput: CreateGroupInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePermissionInput: CreatePermissionInput;
  CreateProjectInput: CreateProjectInput;
  CreateRoleInput: CreateRoleInput;
  CreateTagInput: CreateTagInput;
  CreateUserAuthenticationMethodInput: CreateUserAuthenticationMethodInput;
  CreateUserInput: CreateUserInput;
  CreateUserSessionInput: CreateUserSessionInput;
  Date: Scalars['Date']['output'];
  DeleteUserAuthenticationMethodInput: DeleteUserAuthenticationMethodInput;
  DeleteUserSessionInput: DeleteUserSessionInput;
  GetUserAuthenticationMethodsInput: GetUserAuthenticationMethodsInput;
  GetUserSessionsInput: GetUserSessionsInput;
  Group: Group;
  GroupPage: GroupPage;
  GroupPermission: GroupPermission;
  GroupSortInput: GroupSortInput;
  GroupTag: GroupTag;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  InviteMemberInput: InviteMemberInput;
  JSON: Scalars['JSON']['output'];
  LoginInput: LoginInput;
  LoginResponse: LoginResponse;
  Mutation: Record<PropertyKey, never>;
  Organization: Organization;
  OrganizationGroup: OrganizationGroup;
  OrganizationInvitation: OrganizationInvitation;
  OrganizationInvitationPage: OrganizationInvitationPage;
  OrganizationInvitationSortInput: OrganizationInvitationSortInput;
  OrganizationMember: OrganizationMember;
  OrganizationMemberPage: OrganizationMemberPage;
  OrganizationMemberSortInput: OrganizationMemberSortInput;
  OrganizationPage: OrganizationPage;
  OrganizationPermission: OrganizationPermission;
  OrganizationProject: OrganizationProject;
  OrganizationRole: OrganizationRole;
  OrganizationSortInput: OrganizationSortInput;
  OrganizationTag: OrganizationTag;
  OrganizationUser: OrganizationUser;
  PaginatedResults: ResolversInterfaceTypes<ResolversParentTypes>['PaginatedResults'];
  Permission: Permission;
  PermissionPage: PermissionPage;
  PermissionSortInput: PermissionSortInput;
  PermissionTag: PermissionTag;
  Project: Project;
  ProjectGroup: ProjectGroup;
  ProjectPage: ProjectPage;
  ProjectPermission: ProjectPermission;
  ProjectRole: ProjectRole;
  ProjectSortInput: ProjectSortInput;
  ProjectTag: ProjectTag;
  ProjectUser: ProjectUser;
  Query: Record<PropertyKey, never>;
  RefreshSessionResponse: RefreshSessionResponse;
  RegisterInput: RegisterInput;
  RemoveAccountProjectInput: RemoveAccountProjectInput;
  RemoveGroupPermissionInput: RemoveGroupPermissionInput;
  RemoveGroupTagInput: RemoveGroupTagInput;
  RemoveOrganizationGroupInput: RemoveOrganizationGroupInput;
  RemoveOrganizationMemberInput: RemoveOrganizationMemberInput;
  RemoveOrganizationPermissionInput: RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectInput: RemoveOrganizationProjectInput;
  RemoveOrganizationRoleInput: RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: RemoveOrganizationUserInput;
  RemovePermissionTagInput: RemovePermissionTagInput;
  RemoveProjectGroupInput: RemoveProjectGroupInput;
  RemoveProjectPermissionInput: RemoveProjectPermissionInput;
  RemoveProjectRoleInput: RemoveProjectRoleInput;
  RemoveProjectTagInput: RemoveProjectTagInput;
  RemoveProjectUserInput: RemoveProjectUserInput;
  RemoveRoleGroupInput: RemoveRoleGroupInput;
  RemoveRoleTagInput: RemoveRoleTagInput;
  RemoveUserRoleInput: RemoveUserRoleInput;
  RemoveUserTagInput: RemoveUserTagInput;
  RequestPasswordResetInput: RequestPasswordResetInput;
  RequestPasswordResetResponse: RequestPasswordResetResponse;
  ResendVerificationInput: ResendVerificationInput;
  ResendVerificationResponse: ResendVerificationResponse;
  ResetPasswordInput: ResetPasswordInput;
  ResetPasswordResponse: ResetPasswordResponse;
  RevokeUserSessionResult: RevokeUserSessionResult;
  Role: Role;
  RoleGroup: RoleGroup;
  RolePage: RolePage;
  RoleSortInput: RoleSortInput;
  RoleTag: RoleTag;
  Scope: Scope;
  Searchable: ResolversInterfaceTypes<ResolversParentTypes>['Searchable'];
  String: Scalars['String']['output'];
  Tag: Tag;
  TagPage: TagPage;
  TagSortInput: TagSortInput;
  UpdateAccountInput: UpdateAccountInput;
  UpdateGroupInput: UpdateGroupInput;
  UpdateGroupTagInput: UpdateGroupTagInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationMemberInput: UpdateOrganizationMemberInput;
  UpdateOrganizationTagInput: UpdateOrganizationTagInput;
  UpdatePermissionInput: UpdatePermissionInput;
  UpdatePermissionTagInput: UpdatePermissionTagInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateProjectTagInput: UpdateProjectTagInput;
  UpdateRoleInput: UpdateRoleInput;
  UpdateRoleTagInput: UpdateRoleTagInput;
  UpdateTagInput: UpdateTagInput;
  UpdateUserAuthenticationMethodInput: UpdateUserAuthenticationMethodInput;
  UpdateUserInput: UpdateUserInput;
  UpdateUserSessionInput: UpdateUserSessionInput;
  UpdateUserTagInput: UpdateUserTagInput;
  UploadUserPictureInput: UploadUserPictureInput;
  UploadUserPictureResult: UploadUserPictureResult;
  User: User;
  UserAuthenticationMethod: UserAuthenticationMethod;
  UserPage: UserPage;
  UserRegistrationData: UserRegistrationData;
  UserRole: UserRole;
  UserSession: UserSession;
  UserSessionPage: UserSessionPage;
  UserSessionSortInput: UserSessionSortInput;
  UserSortInput: UserSortInput;
  UserTag: UserTag;
  UsernameAvailability: UsernameAvailability;
  VerifyEmailInput: VerifyEmailInput;
  VerifyEmailResponse: VerifyEmailResponse;
}>;

export type AcceptInvitationResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AcceptInvitationResult'] = ResolversParentTypes['AcceptInvitationResult'],
> = ResolversObject<{
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  invitation?: Resolver<Maybe<ResolversTypes['OrganizationInvitation']>, ParentType, ContextType>;
  isNewUser?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  requiresRegistration?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type AccountResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Account'] = ResolversParentTypes['Account'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  ownerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projects?: Resolver<Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AccountType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountPage'] = ResolversParentTypes['AccountPage'],
> = ResolversObject<{
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountProjectResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AccountProject'] = ResolversParentTypes['AccountProject'],
> = ResolversObject<{
  account?: Resolver<Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditableResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Auditable'] = ResolversParentTypes['Auditable'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'Account'
    | 'AccountProject'
    | 'Group'
    | 'GroupPermission'
    | 'GroupTag'
    | 'Organization'
    | 'OrganizationGroup'
    | 'OrganizationInvitation'
    | 'OrganizationPermission'
    | 'OrganizationProject'
    | 'OrganizationRole'
    | 'OrganizationTag'
    | 'OrganizationUser'
    | 'Permission'
    | 'PermissionTag'
    | 'Project'
    | 'ProjectGroup'
    | 'ProjectPermission'
    | 'ProjectRole'
    | 'ProjectTag'
    | 'ProjectUser'
    | 'Role'
    | 'RoleGroup'
    | 'RoleTag'
    | 'Tag'
    | 'User'
    | 'UserAuthenticationMethod'
    | 'UserRole'
    | 'UserSession'
    | 'UserTag',
    ParentType,
    ContextType
  >;
}>;

export type ChangePasswordResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ChangePasswordResult'] = ResolversParentTypes['ChangePasswordResult'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type CreatableResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Creatable'] = ResolversParentTypes['Creatable'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
}>;

export type CreateAccountResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateAccountResult'] = ResolversParentTypes['CreateAccountResult'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requiresEmailVerification?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  verificationExpiry?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type CreateComplementaryAccountResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateComplementaryAccountResult'] = ResolversParentTypes['CreateComplementaryAccountResult'],
> = ResolversObject<{
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type DeleteUserAuthenticationMethodInputResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['DeleteUserAuthenticationMethodInput'] = ResolversParentTypes['DeleteUserAuthenticationMethodInput'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Group'] = ResolversParentTypes['Group'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['GroupPage'] = ResolversParentTypes['GroupPage'],
> = ResolversObject<{
  groups?: Resolver<Array<ResolversTypes['Group']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupPermissionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['GroupPermission'] = ResolversParentTypes['GroupPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<GroupPermissionGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<
    Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<GroupPermissionPermissionArgs, 'scope'>
  >;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GroupTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['GroupTag'] = ResolversParentTypes['GroupTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<GroupTagGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<
    Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<GroupTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LoginResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['LoginResponse'] = ResolversParentTypes['LoginResponse'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requiresEmailVerification?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  verificationExpiry?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type MutationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  acceptInvitation?: Resolver<
    ResolversTypes['AcceptInvitationResult'],
    ParentType,
    ContextType,
    RequireFields<MutationAcceptInvitationArgs, 'input'>
  >;
  changePassword?: Resolver<
    ResolversTypes['ChangePasswordResult'],
    ParentType,
    ContextType,
    RequireFields<MutationChangePasswordArgs, 'input'>
  >;
  createComplementaryAccount?: Resolver<
    ResolversTypes['CreateComplementaryAccountResult'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateComplementaryAccountArgs, 'input'>
  >;
  createGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateGroupArgs, 'input'>
  >;
  createOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateOrganizationArgs, 'input'>
  >;
  createPermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePermissionArgs, 'input'>
  >;
  createProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateProjectArgs, 'input'>
  >;
  createRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateRoleArgs, 'input'>
  >;
  createTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateTagArgs, 'input'>
  >;
  createUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateUserArgs, 'input'>
  >;
  deleteAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteAccountArgs, 'id'>
  >;
  deleteGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteGroupArgs, 'id' | 'scope'>
  >;
  deleteOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteOrganizationArgs, 'id'>
  >;
  deletePermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<MutationDeletePermissionArgs, 'id' | 'scope'>
  >;
  deleteProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteProjectArgs, 'id' | 'scope'>
  >;
  deleteRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteRoleArgs, 'id' | 'scope'>
  >;
  deleteTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteTagArgs, 'id' | 'scope'>
  >;
  deleteUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteUserArgs, 'id' | 'scope'>
  >;
  inviteMember?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<MutationInviteMemberArgs, 'input'>
  >;
  login?: Resolver<
    ResolversTypes['LoginResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationLoginArgs, 'input'>
  >;
  refreshSession?: Resolver<
    ResolversTypes['RefreshSessionResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationRefreshSessionArgs, 'accessToken' | 'refreshToken'>
  >;
  register?: Resolver<
    ResolversTypes['CreateAccountResult'],
    ParentType,
    ContextType,
    RequireFields<MutationRegisterArgs, 'input'>
  >;
  removeOrganizationMember?: Resolver<
    ResolversTypes['OrganizationMember'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveOrganizationMemberArgs, 'input'>
  >;
  requestPasswordReset?: Resolver<
    ResolversTypes['RequestPasswordResetResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationRequestPasswordResetArgs, 'input'>
  >;
  resendInvitationEmail?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<MutationResendInvitationEmailArgs, 'id'>
  >;
  resendVerification?: Resolver<
    ResolversTypes['ResendVerificationResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationResendVerificationArgs, 'input'>
  >;
  resetPassword?: Resolver<
    ResolversTypes['ResetPasswordResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationResetPasswordArgs, 'input'>
  >;
  revokeInvitation?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<MutationRevokeInvitationArgs, 'id'>
  >;
  revokeUserSession?: Resolver<
    ResolversTypes['RevokeUserSessionResult'],
    ParentType,
    ContextType,
    RequireFields<MutationRevokeUserSessionArgs, 'id'>
  >;
  updateAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateAccountArgs, 'id' | 'input'>
  >;
  updateGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateGroupArgs, 'id' | 'input'>
  >;
  updateOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateOrganizationArgs, 'id' | 'input'>
  >;
  updateOrganizationMember?: Resolver<
    ResolversTypes['OrganizationMember'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateOrganizationMemberArgs, 'input' | 'organizationId' | 'userId'>
  >;
  updatePermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePermissionArgs, 'id' | 'input'>
  >;
  updateProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateProjectArgs, 'id' | 'input'>
  >;
  updateRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateRoleArgs, 'id' | 'input'>
  >;
  updateTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateTagArgs, 'id' | 'input'>
  >;
  updateUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateUserArgs, 'id' | 'input'>
  >;
  uploadUserPicture?: Resolver<
    ResolversTypes['UploadUserPictureResult'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadUserPictureArgs, 'input'>
  >;
  verifyEmail?: Resolver<
    ResolversTypes['VerifyEmailResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationVerifyEmailArgs, 'input'>
  >;
}>;

export type OrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  projects?: Resolver<Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationGroupResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationGroup'] = ResolversParentTypes['OrganizationGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationInvitationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationInvitation'] = ResolversParentTypes['OrganizationInvitation'],
> = ResolversObject<{
  acceptedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invitedBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inviter?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OrganizationInvitationStatus'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationInvitationPageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationInvitationPage'] = ResolversParentTypes['OrganizationInvitationPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  invitations?: Resolver<Array<ResolversTypes['OrganizationInvitation']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrganizationMemberResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationMember'] = ResolversParentTypes['OrganizationMember'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invitation?: Resolver<Maybe<ResolversTypes['OrganizationInvitation']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  status?: Resolver<Maybe<ResolversTypes['OrganizationInvitationStatus']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['MemberType'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type OrganizationMemberPageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationMemberPage'] = ResolversParentTypes['OrganizationMemberPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['OrganizationMember']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrganizationPageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationPage'] = ResolversParentTypes['OrganizationPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPermissionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationPermission'] = ResolversParentTypes['OrganizationPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationProject'] = ResolversParentTypes['OrganizationProject'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationRoleResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationRole'] = ResolversParentTypes['OrganizationRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationTagResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationTag'] = ResolversParentTypes['OrganizationTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationUserResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationUser'] = ResolversParentTypes['OrganizationUser'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PaginatedResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PaginatedResults'] = ResolversParentTypes['PaginatedResults'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'AccountPage'
    | 'GroupPage'
    | 'OrganizationPage'
    | 'PermissionPage'
    | 'ProjectPage'
    | 'RolePage'
    | 'TagPage'
    | 'UserPage'
    | 'UserSessionPage',
    ParentType,
    ContextType
  >;
}>;

export type PermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Permission'] = ResolversParentTypes['Permission'],
> = ResolversObject<{
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionPageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PermissionPage'] = ResolversParentTypes['PermissionPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PermissionTag'] = ResolversParentTypes['PermissionTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permission?: Resolver<
    Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<PermissionTagPermissionArgs, 'scope'>
  >;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<
    Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<PermissionTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectGroup'] = ResolversParentTypes['ProjectGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<ProjectGroupProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectPage'] = ResolversParentTypes['ProjectPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPermissionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProjectPermission'] = ResolversParentTypes['ProjectPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<ProjectPermissionProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectRole'] = ResolversParentTypes['ProjectRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<ProjectRoleProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectTag'] = ResolversParentTypes['ProjectTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  project?: Resolver<
    Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<ProjectTagProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectUser'] = ResolversParentTypes['ProjectUser'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<ProjectUserProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  accounts?: Resolver<
    ResolversTypes['AccountPage'],
    ParentType,
    ContextType,
    Partial<QueryAccountsArgs>
  >;
  checkUsername?: Resolver<
    ResolversTypes['UsernameAvailability'],
    ParentType,
    ContextType,
    RequireFields<QueryCheckUsernameArgs, 'username'>
  >;
  groups?: Resolver<
    ResolversTypes['GroupPage'],
    ParentType,
    ContextType,
    RequireFields<QueryGroupsArgs, 'scope'>
  >;
  invitation?: Resolver<
    Maybe<ResolversTypes['OrganizationInvitation']>,
    ParentType,
    ContextType,
    RequireFields<QueryInvitationArgs, 'token'>
  >;
  organizationInvitations?: Resolver<
    ResolversTypes['OrganizationInvitationPage'],
    ParentType,
    ContextType,
    RequireFields<QueryOrganizationInvitationsArgs, 'organizationId'>
  >;
  organizationMembers?: Resolver<
    ResolversTypes['OrganizationMemberPage'],
    ParentType,
    ContextType,
    RequireFields<QueryOrganizationMembersArgs, 'organizationId'>
  >;
  organizations?: Resolver<
    ResolversTypes['OrganizationPage'],
    ParentType,
    ContextType,
    Partial<QueryOrganizationsArgs>
  >;
  permissions?: Resolver<
    ResolversTypes['PermissionPage'],
    ParentType,
    ContextType,
    RequireFields<QueryPermissionsArgs, 'scope'>
  >;
  projects?: Resolver<
    ResolversTypes['ProjectPage'],
    ParentType,
    ContextType,
    RequireFields<QueryProjectsArgs, 'scope'>
  >;
  roles?: Resolver<
    ResolversTypes['RolePage'],
    ParentType,
    ContextType,
    RequireFields<QueryRolesArgs, 'scope'>
  >;
  tags?: Resolver<
    ResolversTypes['TagPage'],
    ParentType,
    ContextType,
    RequireFields<QueryTagsArgs, 'scope'>
  >;
  userAuthenticationMethods?: Resolver<
    Array<ResolversTypes['UserAuthenticationMethod']>,
    ParentType,
    ContextType,
    RequireFields<QueryUserAuthenticationMethodsArgs, 'input'>
  >;
  userSessions?: Resolver<
    ResolversTypes['UserSessionPage'],
    ParentType,
    ContextType,
    RequireFields<QueryUserSessionsArgs, 'input'>
  >;
  users?: Resolver<
    ResolversTypes['UserPage'],
    ParentType,
    ContextType,
    RequireFields<QueryUsersArgs, 'scope'>
  >;
}>;

export type RefreshSessionResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RefreshSessionResponse'] = ResolversParentTypes['RefreshSessionResponse'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RequestPasswordResetResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RequestPasswordResetResponse'] = ResolversParentTypes['RequestPasswordResetResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ResendVerificationResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ResendVerificationResponse'] = ResolversParentTypes['ResendVerificationResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ResetPasswordResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ResetPasswordResponse'] = ResolversParentTypes['ResetPasswordResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RevokeUserSessionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RevokeUserSessionResult'] = ResolversParentTypes['RevokeUserSessionResult'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoleGroup'] = ResolversParentTypes['RoleGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<RoleGroupGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<
    Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<RoleGroupRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolePage'] = ResolversParentTypes['RolePage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoleTag'] = ResolversParentTypes['RoleTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  role?: Resolver<
    Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<RoleTagRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<
    Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<RoleTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SearchableResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Searchable'] = ResolversParentTypes['Searchable'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
}>;

export type TagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag'],
> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['TagPage'] = ResolversParentTypes['TagPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UploadUserPictureResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UploadUserPictureResult'] = ResolversParentTypes['UploadUserPictureResult'],
> = ResolversObject<{
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  accounts?: Resolver<Maybe<Array<ResolversTypes['Account']>>, ParentType, ContextType>;
  authenticationMethods?: Resolver<
    Maybe<Array<ResolversTypes['UserAuthenticationMethod']>>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pictureUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  roles?: Resolver<Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  tags?: Resolver<Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserAuthenticationMethodResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserAuthenticationMethod'] = ResolversParentTypes['UserAuthenticationMethod'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['UserAuthenticationMethodProvider'], ParentType, ContextType>;
  providerData?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  providerId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserPage'] = ResolversParentTypes['UserPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserRole'] = ResolversParentTypes['UserRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<
    Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<UserRoleRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<UserRoleUserArgs, 'scope'>
  >;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSessionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserSession'] = ResolversParentTypes['UserSession'],
> = ResolversObject<{
  audience?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ipAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userAuthenticationMethod?: Resolver<
    Maybe<ResolversTypes['UserAuthenticationMethod']>,
    ParentType,
    ContextType
  >;
  userAuthenticationMethodId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSessionPageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserSessionPage'] = ResolversParentTypes['UserSessionPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userSessions?: Resolver<Array<ResolversTypes['UserSession']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserTag'] = ResolversParentTypes['UserTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<
    Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<UserTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<UserTagUserArgs, 'scope'>
  >;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UsernameAvailabilityResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UsernameAvailability'] = ResolversParentTypes['UsernameAvailability'],
> = ResolversObject<{
  available?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VerifyEmailResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VerifyEmailResponse'] = ResolversParentTypes['VerifyEmailResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = any> = ResolversObject<{
  AcceptInvitationResult?: AcceptInvitationResultResolvers<ContextType>;
  Account?: AccountResolvers<ContextType>;
  AccountPage?: AccountPageResolvers<ContextType>;
  AccountProject?: AccountProjectResolvers<ContextType>;
  Auditable?: AuditableResolvers<ContextType>;
  ChangePasswordResult?: ChangePasswordResultResolvers<ContextType>;
  Creatable?: CreatableResolvers<ContextType>;
  CreateAccountResult?: CreateAccountResultResolvers<ContextType>;
  CreateComplementaryAccountResult?: CreateComplementaryAccountResultResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DeleteUserAuthenticationMethodInput?: DeleteUserAuthenticationMethodInputResolvers<ContextType>;
  Group?: GroupResolvers<ContextType>;
  GroupPage?: GroupPageResolvers<ContextType>;
  GroupPermission?: GroupPermissionResolvers<ContextType>;
  GroupTag?: GroupTagResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LoginResponse?: LoginResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationGroup?: OrganizationGroupResolvers<ContextType>;
  OrganizationInvitation?: OrganizationInvitationResolvers<ContextType>;
  OrganizationInvitationPage?: OrganizationInvitationPageResolvers<ContextType>;
  OrganizationMember?: OrganizationMemberResolvers<ContextType>;
  OrganizationMemberPage?: OrganizationMemberPageResolvers<ContextType>;
  OrganizationPage?: OrganizationPageResolvers<ContextType>;
  OrganizationPermission?: OrganizationPermissionResolvers<ContextType>;
  OrganizationProject?: OrganizationProjectResolvers<ContextType>;
  OrganizationRole?: OrganizationRoleResolvers<ContextType>;
  OrganizationTag?: OrganizationTagResolvers<ContextType>;
  OrganizationUser?: OrganizationUserResolvers<ContextType>;
  PaginatedResults?: PaginatedResultsResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PermissionPage?: PermissionPageResolvers<ContextType>;
  PermissionTag?: PermissionTagResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectGroup?: ProjectGroupResolvers<ContextType>;
  ProjectPage?: ProjectPageResolvers<ContextType>;
  ProjectPermission?: ProjectPermissionResolvers<ContextType>;
  ProjectRole?: ProjectRoleResolvers<ContextType>;
  ProjectTag?: ProjectTagResolvers<ContextType>;
  ProjectUser?: ProjectUserResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RefreshSessionResponse?: RefreshSessionResponseResolvers<ContextType>;
  RequestPasswordResetResponse?: RequestPasswordResetResponseResolvers<ContextType>;
  ResendVerificationResponse?: ResendVerificationResponseResolvers<ContextType>;
  ResetPasswordResponse?: ResetPasswordResponseResolvers<ContextType>;
  RevokeUserSessionResult?: RevokeUserSessionResultResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleGroup?: RoleGroupResolvers<ContextType>;
  RolePage?: RolePageResolvers<ContextType>;
  RoleTag?: RoleTagResolvers<ContextType>;
  Searchable?: SearchableResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagPage?: TagPageResolvers<ContextType>;
  UploadUserPictureResult?: UploadUserPictureResultResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserAuthenticationMethod?: UserAuthenticationMethodResolvers<ContextType>;
  UserPage?: UserPageResolvers<ContextType>;
  UserRole?: UserRoleResolvers<ContextType>;
  UserSession?: UserSessionResolvers<ContextType>;
  UserSessionPage?: UserSessionPageResolvers<ContextType>;
  UserTag?: UserTagResolvers<ContextType>;
  UsernameAvailability?: UsernameAvailabilityResolvers<ContextType>;
  VerifyEmailResponse?: VerifyEmailResponseResolvers<ContextType>;
}>;
