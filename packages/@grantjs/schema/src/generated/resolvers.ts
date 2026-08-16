import type * as Types from './schema-types';
import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
) => Types.Maybe<TTypes> | Promise<Types.Maybe<TTypes>>;

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
    | Types.Account
    | Types.AccountProject
    | Types.AccountProjectApiKey
    | Types.AccountProjectTag
    | Types.AccountRole
    | Types.AccountTag
    | Types.ApiKey
    | Types.Group
    | Types.GroupPermission
    | Types.GroupTag
    | Types.Organization
    | Types.OrganizationGroup
    | Types.OrganizationInvitation
    | Types.OrganizationPermission
    | Types.OrganizationProject
    | Types.OrganizationProjectApiKey
    | Types.OrganizationProjectTag
    | Types.OrganizationRole
    | Types.OrganizationTag
    | Types.OrganizationUser
    | Types.Permission
    | Types.PermissionTag
    | Types.Project
    | Types.ProjectApp
    | Types.ProjectAppTag
    | Types.ProjectGroup
    | Types.ProjectPermission
    | Types.ProjectResource
    | Types.ProjectRole
    | Types.ProjectRolePermission
    | Types.ProjectTag
    | Types.ProjectUser
    | Types.ProjectUserApiKey
    | Types.ProjectUserGroup
    | Types.ProjectUserPermission
    | Types.Resource
    | Types.ResourceTag
    | Types.Role
    | Types.RoleGroup
    | Types.RolePermission
    | Types.RoleTag
    | Types.SigningKey
    | Types.Tag
    | Types.User
    | Types.UserAuthenticationMethod
    | Types.UserGroup
    | Types.UserPermission
    | Types.UserRole
    | Types.UserSession
    | Types.UserTag;
  Creatable: never;
  PaginatedResults:
    | Types.AccountPage
    | Types.ApiKeyPage
    | Types.GroupPage
    | Types.OrganizationPage
    | Types.PermissionPage
    | Types.ProjectAppPage
    | Types.ProjectPage
    | Types.ProjectSyncJobPage
    | Types.ResourcePage
    | Types.RolePage
    | Types.TagPage
    | Types.UserPage
    | Types.UserSessionPage;
  Searchable: never;
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AcceptInvitationInput: Types.AcceptInvitationInput;
  AcceptInvitationResult: ResolverTypeWrapper<Types.AcceptInvitationResult>;
  Account: ResolverTypeWrapper<Types.Account>;
  AccountExportData: ResolverTypeWrapper<Types.AccountExportData>;
  AccountPage: ResolverTypeWrapper<Types.AccountPage>;
  AccountProject: ResolverTypeWrapper<Types.AccountProject>;
  AccountProjectApiKey: ResolverTypeWrapper<Types.AccountProjectApiKey>;
  AccountProjectTag: ResolverTypeWrapper<Types.AccountProjectTag>;
  AccountRole: ResolverTypeWrapper<Types.AccountRole>;
  AccountSearchableField: Types.AccountSearchableField;
  AccountSortInput: Types.AccountSortInput;
  AccountSortableField: Types.AccountSortableField;
  AccountTag: ResolverTypeWrapper<Types.AccountTag>;
  AccountType: Types.AccountType;
  AddAccountProjectApiKeyInput: Types.AddAccountProjectApiKeyInput;
  AddAccountProjectInput: Types.AddAccountProjectInput;
  AddAccountProjectTagInput: Types.AddAccountProjectTagInput;
  AddAccountRoleInput: Types.AddAccountRoleInput;
  AddAccountTagInput: Types.AddAccountTagInput;
  AddGroupPermissionInput: Types.AddGroupPermissionInput;
  AddGroupTagInput: Types.AddGroupTagInput;
  AddOrganizationGroupInput: Types.AddOrganizationGroupInput;
  AddOrganizationPermissionInput: Types.AddOrganizationPermissionInput;
  AddOrganizationProjectApiKeyInput: Types.AddOrganizationProjectApiKeyInput;
  AddOrganizationProjectInput: Types.AddOrganizationProjectInput;
  AddOrganizationProjectTagInput: Types.AddOrganizationProjectTagInput;
  AddOrganizationRoleInput: Types.AddOrganizationRoleInput;
  AddOrganizationTagInput: Types.AddOrganizationTagInput;
  AddOrganizationUserInput: Types.AddOrganizationUserInput;
  AddPermissionTagInput: Types.AddPermissionTagInput;
  AddProjectAppTagInput: Types.AddProjectAppTagInput;
  AddProjectGroupInput: Types.AddProjectGroupInput;
  AddProjectPermissionInput: Types.AddProjectPermissionInput;
  AddProjectResourceInput: Types.AddProjectResourceInput;
  AddProjectRoleInput: Types.AddProjectRoleInput;
  AddProjectRolePermissionInput: Types.AddProjectRolePermissionInput;
  AddProjectTagInput: Types.AddProjectTagInput;
  AddProjectUserApiKeyInput: Types.AddProjectUserApiKeyInput;
  AddProjectUserGroupInput: Types.AddProjectUserGroupInput;
  AddProjectUserInput: Types.AddProjectUserInput;
  AddProjectUserPermissionInput: Types.AddProjectUserPermissionInput;
  AddResourceTagInput: Types.AddResourceTagInput;
  AddRoleGroupInput: Types.AddRoleGroupInput;
  AddRoleTagInput: Types.AddRoleTagInput;
  AddUserGroupInput: Types.AddUserGroupInput;
  AddUserRoleInput: Types.AddUserRoleInput;
  AddUserTagInput: Types.AddUserTagInput;
  ApiKey: ResolverTypeWrapper<Types.ApiKey>;
  ApiKeyPage: ResolverTypeWrapper<Types.ApiKeyPage>;
  ApiKeySearchableField: Types.ApiKeySearchableField;
  ApiKeySortInput: Types.ApiKeySortInput;
  ApiKeySortableField: Types.ApiKeySortableField;
  AssignRolePermissionInput: Types.AssignRolePermissionInput;
  AssignUserPermissionInput: Types.AssignUserPermissionInput;
  Auditable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Auditable']>;
  AuthenticationMethodExportData: ResolverTypeWrapper<Types.AuthenticationMethodExportData>;
  AuthorizationReason: Types.AuthorizationReason;
  AuthorizationResult: ResolverTypeWrapper<Types.AuthorizationResult>;
  Boolean: ResolverTypeWrapper<Types.Scalars['Boolean']['output']>;
  CdmFindBy: Types.CdmFindBy;
  CdmIfMissing: Types.CdmIfMissing;
  CdmKeyResolverInput: Types.CdmKeyResolverInput;
  CdmModeInput: Types.CdmModeInput;
  CdmModeStrategy: Types.CdmModeStrategy;
  CdmOnConflict: Types.CdmOnConflict;
  ChangeMyPasswordInput: Types.ChangeMyPasswordInput;
  ChangeMyPasswordResult: ResolverTypeWrapper<Types.ChangeMyPasswordResult>;
  Creatable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Creatable']>;
  CreateAccountInput: Types.CreateAccountInput;
  CreateAccountResult: ResolverTypeWrapper<Types.CreateAccountResult>;
  CreateApiKeyInput: Types.CreateApiKeyInput;
  CreateApiKeyResult: ResolverTypeWrapper<Types.CreateApiKeyResult>;
  CreateGroupInput: Types.CreateGroupInput;
  CreateMySecondaryAccountResult: ResolverTypeWrapper<Types.CreateMySecondaryAccountResult>;
  CreateMyUserAuthenticationMethodInput: Types.CreateMyUserAuthenticationMethodInput;
  CreateOrganizationInput: Types.CreateOrganizationInput;
  CreateOrganizationInvitationInput: Types.CreateOrganizationInvitationInput;
  CreatePermissionInput: Types.CreatePermissionInput;
  CreateProjectAppInput: Types.CreateProjectAppInput;
  CreateProjectAppResult: ResolverTypeWrapper<Types.CreateProjectAppResult>;
  CreateProjectInput: Types.CreateProjectInput;
  CreateResourceInput: Types.CreateResourceInput;
  CreateRoleInput: Types.CreateRoleInput;
  CreateTagInput: Types.CreateTagInput;
  CreateUserAuthenticationMethodInput: Types.CreateUserAuthenticationMethodInput;
  CreateUserInput: Types.CreateUserInput;
  CreateUserSessionInput: Types.CreateUserSessionInput;
  CreateWebhookSubscriptionMutationInput: Types.CreateWebhookSubscriptionMutationInput;
  Date: ResolverTypeWrapper<Types.Scalars['Date']['output']>;
  DeleteApiKeyInput: Types.DeleteApiKeyInput;
  DeleteMyAccountsInput: Types.DeleteMyAccountsInput;
  DeleteUserAuthenticationMethodInput: Types.DeleteUserAuthenticationMethodInput;
  DeleteUserSessionInput: Types.DeleteUserSessionInput;
  DeleteWebhookSubscriptionInput: Types.DeleteWebhookSubscriptionInput;
  EmailVerificationProofInput: Types.EmailVerificationProofInput;
  EmailVerificationProofType: Types.EmailVerificationProofType;
  ExchangeApiKeyInput: Types.ExchangeApiKeyInput;
  ExchangeApiKeyResult: ResolverTypeWrapper<Types.ExchangeApiKeyResult>;
  GenerateMyMfaRecoveryCodesInput: Types.GenerateMyMfaRecoveryCodesInput;
  GetUserAuthenticationMethodsInput: Types.GetUserAuthenticationMethodsInput;
  GetUserSessionsInput: Types.GetUserSessionsInput;
  Group: ResolverTypeWrapper<Types.Group>;
  GroupCdmInput: Types.GroupCdmInput;
  GroupPage: ResolverTypeWrapper<Types.GroupPage>;
  GroupPermission: ResolverTypeWrapper<Types.GroupPermission>;
  GroupSearchableField: Types.GroupSearchableField;
  GroupSortInput: Types.GroupSortInput;
  GroupSortableField: Types.GroupSortableField;
  GroupTag: ResolverTypeWrapper<Types.GroupTag>;
  ID: ResolverTypeWrapper<Types.Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Types.Scalars['Int']['output']>;
  InviteMemberInput: Types.InviteMemberInput;
  IsAuthorizedContextInput: Types.IsAuthorizedContextInput;
  IsAuthorizedInput: Types.IsAuthorizedInput;
  IsAuthorizedPermissionInput: Types.IsAuthorizedPermissionInput;
  JSON: ResolverTypeWrapper<Types.Scalars['JSON']['output']>;
  LoginInput: Types.LoginInput;
  LoginResponse: ResolverTypeWrapper<Types.LoginResponse>;
  LogoutMyUserResponse: ResolverTypeWrapper<Types.LogoutMyUserResponse>;
  MarkAllNotificationsReadResult: ResolverTypeWrapper<Types.MarkAllNotificationsReadResult>;
  MeResponse: ResolverTypeWrapper<Types.MeResponse>;
  MemberType: Types.MemberType;
  MfaDevice: ResolverTypeWrapper<Types.MfaDevice>;
  MfaEnrollment: ResolverTypeWrapper<Types.MfaEnrollment>;
  MfaRecoveryCodeStatus: ResolverTypeWrapper<Types.MfaRecoveryCodeStatus>;
  MfaSetupResponse: ResolverTypeWrapper<Types.MfaSetupResponse>;
  MfaVerifyResponse: ResolverTypeWrapper<Types.MfaVerifyResponse>;
  MfaVerifyResult: ResolverTypeWrapper<Types.MfaVerifyResult>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MyNotificationsInput: Types.MyNotificationsInput;
  MyProjectMembership: ResolverTypeWrapper<Types.MyProjectMembership>;
  MyUserSessionsInput: Types.MyUserSessionsInput;
  Notification: ResolverTypeWrapper<Types.Notification>;
  NotificationChannel: Types.NotificationChannel;
  NotificationEventScope: ResolverTypeWrapper<Types.NotificationEventScope>;
  NotificationPage: ResolverTypeWrapper<Types.NotificationPage>;
  NotificationPreference: ResolverTypeWrapper<Types.NotificationPreference>;
  NotificationPreferenceSource: Types.NotificationPreferenceSource;
  NotificationStatus: Types.NotificationStatus;
  Organization: ResolverTypeWrapper<Types.Organization>;
  OrganizationGroup: ResolverTypeWrapper<Types.OrganizationGroup>;
  OrganizationInvitation: ResolverTypeWrapper<Types.OrganizationInvitation>;
  OrganizationInvitationPage: ResolverTypeWrapper<Types.OrganizationInvitationPage>;
  OrganizationInvitationSearchableField: Types.OrganizationInvitationSearchableField;
  OrganizationInvitationSortInput: Types.OrganizationInvitationSortInput;
  OrganizationInvitationSortableField: Types.OrganizationInvitationSortableField;
  OrganizationInvitationStatus: Types.OrganizationInvitationStatus;
  OrganizationMember: ResolverTypeWrapper<Types.OrganizationMember>;
  OrganizationMemberPage: ResolverTypeWrapper<Types.OrganizationMemberPage>;
  OrganizationMemberSearchableField: Types.OrganizationMemberSearchableField;
  OrganizationMemberSortInput: Types.OrganizationMemberSortInput;
  OrganizationMemberSortableField: Types.OrganizationMemberSortableField;
  OrganizationMembershipExportData: ResolverTypeWrapper<Types.OrganizationMembershipExportData>;
  OrganizationPage: ResolverTypeWrapper<Types.OrganizationPage>;
  OrganizationPermission: ResolverTypeWrapper<Types.OrganizationPermission>;
  OrganizationProject: ResolverTypeWrapper<Types.OrganizationProject>;
  OrganizationProjectApiKey: ResolverTypeWrapper<Types.OrganizationProjectApiKey>;
  OrganizationProjectTag: ResolverTypeWrapper<Types.OrganizationProjectTag>;
  OrganizationRole: ResolverTypeWrapper<Types.OrganizationRole>;
  OrganizationSearchableField: Types.OrganizationSearchableField;
  OrganizationSortInput: Types.OrganizationSortInput;
  OrganizationSortableField: Types.OrganizationSortableField;
  OrganizationTag: ResolverTypeWrapper<Types.OrganizationTag>;
  OrganizationUser: ResolverTypeWrapper<Types.OrganizationUser>;
  PaginatedResults: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['PaginatedResults']
  >;
  Permission: ResolverTypeWrapper<Types.Permission>;
  PermissionCdmInput: Types.PermissionCdmInput;
  PermissionPage: ResolverTypeWrapper<Types.PermissionPage>;
  PermissionSearchableField: Types.PermissionSearchableField;
  PermissionSortInput: Types.PermissionSortInput;
  PermissionSortableField: Types.PermissionSortableField;
  PermissionTag: ResolverTypeWrapper<Types.PermissionTag>;
  Project: ResolverTypeWrapper<Types.Project>;
  ProjectApp: ResolverTypeWrapper<Types.ProjectApp>;
  ProjectAppPage: ResolverTypeWrapper<Types.ProjectAppPage>;
  ProjectAppSearchableField: Types.ProjectAppSearchableField;
  ProjectAppSortInput: Types.ProjectAppSortInput;
  ProjectAppSortableField: Types.ProjectAppSortableField;
  ProjectAppTag: ResolverTypeWrapper<Types.ProjectAppTag>;
  ProjectGroup: ResolverTypeWrapper<Types.ProjectGroup>;
  ProjectMembershipExportData: ResolverTypeWrapper<Types.ProjectMembershipExportData>;
  ProjectPage: ResolverTypeWrapper<Types.ProjectPage>;
  ProjectPermission: ResolverTypeWrapper<Types.ProjectPermission>;
  ProjectResource: ResolverTypeWrapper<Types.ProjectResource>;
  ProjectRole: ResolverTypeWrapper<Types.ProjectRole>;
  ProjectRolePermission: ResolverTypeWrapper<Types.ProjectRolePermission>;
  ProjectSearchableField: Types.ProjectSearchableField;
  ProjectSortInput: Types.ProjectSortInput;
  ProjectSortableField: Types.ProjectSortableField;
  ProjectSyncJob: ResolverTypeWrapper<Types.ProjectSyncJob>;
  ProjectSyncJobOperation: Types.ProjectSyncJobOperation;
  ProjectSyncJobPage: ResolverTypeWrapper<Types.ProjectSyncJobPage>;
  ProjectSyncJobSortInput: Types.ProjectSyncJobSortInput;
  ProjectSyncJobSortableField: Types.ProjectSyncJobSortableField;
  ProjectSyncJobStatus: Types.ProjectSyncJobStatus;
  ProjectTag: ResolverTypeWrapper<Types.ProjectTag>;
  ProjectUser: ResolverTypeWrapper<Types.ProjectUser>;
  ProjectUserApiKey: ResolverTypeWrapper<Types.ProjectUserApiKey>;
  ProjectUserGroup: ResolverTypeWrapper<Types.ProjectUserGroup>;
  ProjectUserPermission: ResolverTypeWrapper<Types.ProjectUserPermission>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  QueryAccountProjectApiKeysInput: Types.QueryAccountProjectApiKeysInput;
  QueryAccountProjectInput: Types.QueryAccountProjectInput;
  QueryAccountProjectTagInput: Types.QueryAccountProjectTagInput;
  QueryAccountProjectsInput: Types.QueryAccountProjectsInput;
  QueryAccountRolesInput: Types.QueryAccountRolesInput;
  QueryAccountTagsInput: Types.QueryAccountTagsInput;
  QueryAccountsInput: Types.QueryAccountsInput;
  QueryGroupPermissionsInput: Types.QueryGroupPermissionsInput;
  QueryGroupTagsInput: Types.QueryGroupTagsInput;
  QueryOrganizationGroupsInput: Types.QueryOrganizationGroupsInput;
  QueryOrganizationPermissionsInput: Types.QueryOrganizationPermissionsInput;
  QueryOrganizationProjectApiKeysInput: Types.QueryOrganizationProjectApiKeysInput;
  QueryOrganizationProjectTagInput: Types.QueryOrganizationProjectTagInput;
  QueryOrganizationProjectsInput: Types.QueryOrganizationProjectsInput;
  QueryOrganizationRolesInput: Types.QueryOrganizationRolesInput;
  QueryOrganizationTagsInput: Types.QueryOrganizationTagsInput;
  QueryOrganizationUsersInput: Types.QueryOrganizationUsersInput;
  QueryPermissionTagsInput: Types.QueryPermissionTagsInput;
  QueryProjectAppTagsInput: Types.QueryProjectAppTagsInput;
  QueryProjectGroupsInput: Types.QueryProjectGroupsInput;
  QueryProjectPermissionsInput: Types.QueryProjectPermissionsInput;
  QueryProjectResourcesInput: Types.QueryProjectResourcesInput;
  QueryProjectRolePermissionsInput: Types.QueryProjectRolePermissionsInput;
  QueryProjectRolesInput: Types.QueryProjectRolesInput;
  QueryProjectTagsInput: Types.QueryProjectTagsInput;
  QueryProjectUserApiKeysInput: Types.QueryProjectUserApiKeysInput;
  QueryProjectUserGroupsInput: Types.QueryProjectUserGroupsInput;
  QueryProjectUserPermissionsInput: Types.QueryProjectUserPermissionsInput;
  QueryProjectUsersInput: Types.QueryProjectUsersInput;
  QueryResourceTagsInput: Types.QueryResourceTagsInput;
  QueryRoleGroupsInput: Types.QueryRoleGroupsInput;
  QueryRolePermissionsInput: Types.QueryRolePermissionsInput;
  QueryRoleTagsInput: Types.QueryRoleTagsInput;
  QueryUserGroupsInput: Types.QueryUserGroupsInput;
  QueryUserPermissionsInput: Types.QueryUserPermissionsInput;
  QueryUserRolesInput: Types.QueryUserRolesInput;
  QueryUserTagsInput: Types.QueryUserTagsInput;
  RefreshSessionResponse: ResolverTypeWrapper<Types.RefreshSessionResponse>;
  RegisterInput: Types.RegisterInput;
  RemoveAccountProjectApiKeyInput: Types.RemoveAccountProjectApiKeyInput;
  RemoveAccountProjectInput: Types.RemoveAccountProjectInput;
  RemoveAccountProjectTagInput: Types.RemoveAccountProjectTagInput;
  RemoveAccountRoleInput: Types.RemoveAccountRoleInput;
  RemoveAccountTagInput: Types.RemoveAccountTagInput;
  RemoveGroupPermissionInput: Types.RemoveGroupPermissionInput;
  RemoveGroupTagInput: Types.RemoveGroupTagInput;
  RemoveMyMfaDeviceInput: Types.RemoveMyMfaDeviceInput;
  RemoveOrganizationGroupInput: Types.RemoveOrganizationGroupInput;
  RemoveOrganizationMemberInput: Types.RemoveOrganizationMemberInput;
  RemoveOrganizationPermissionInput: Types.RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectApiKeyInput: Types.RemoveOrganizationProjectApiKeyInput;
  RemoveOrganizationProjectInput: Types.RemoveOrganizationProjectInput;
  RemoveOrganizationProjectTagInput: Types.RemoveOrganizationProjectTagInput;
  RemoveOrganizationRoleInput: Types.RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: Types.RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: Types.RemoveOrganizationUserInput;
  RemovePermissionTagInput: Types.RemovePermissionTagInput;
  RemoveProjectAppTagInput: Types.RemoveProjectAppTagInput;
  RemoveProjectGroupInput: Types.RemoveProjectGroupInput;
  RemoveProjectPermissionInput: Types.RemoveProjectPermissionInput;
  RemoveProjectResourceInput: Types.RemoveProjectResourceInput;
  RemoveProjectRoleInput: Types.RemoveProjectRoleInput;
  RemoveProjectRolePermissionInput: Types.RemoveProjectRolePermissionInput;
  RemoveProjectTagInput: Types.RemoveProjectTagInput;
  RemoveProjectUserApiKeyInput: Types.RemoveProjectUserApiKeyInput;
  RemoveProjectUserGroupInput: Types.RemoveProjectUserGroupInput;
  RemoveProjectUserInput: Types.RemoveProjectUserInput;
  RemoveProjectUserPermissionInput: Types.RemoveProjectUserPermissionInput;
  RemoveResourceTagInput: Types.RemoveResourceTagInput;
  RemoveRoleGroupInput: Types.RemoveRoleGroupInput;
  RemoveRoleTagInput: Types.RemoveRoleTagInput;
  RemoveUserGroupInput: Types.RemoveUserGroupInput;
  RemoveUserRoleInput: Types.RemoveUserRoleInput;
  RemoveUserTagInput: Types.RemoveUserTagInput;
  ReplayWebhookDeliveryInput: Types.ReplayWebhookDeliveryInput;
  RequestPasswordResetInput: Types.RequestPasswordResetInput;
  RequestPasswordResetResponse: ResolverTypeWrapper<Types.RequestPasswordResetResponse>;
  ResendVerificationInput: Types.ResendVerificationInput;
  ResendVerificationResponse: ResolverTypeWrapper<Types.ResendVerificationResponse>;
  ResetPasswordInput: Types.ResetPasswordInput;
  ResetPasswordResponse: ResolverTypeWrapper<Types.ResetPasswordResponse>;
  Resource: ResolverTypeWrapper<Types.Resource>;
  ResourceCdmInput: Types.ResourceCdmInput;
  ResourcePage: ResolverTypeWrapper<Types.ResourcePage>;
  ResourceSearchableField: Types.ResourceSearchableField;
  ResourceSortInput: Types.ResourceSortInput;
  ResourceSortableField: Types.ResourceSortableField;
  ResourceTag: ResolverTypeWrapper<Types.ResourceTag>;
  RevokeApiKeyInput: Types.RevokeApiKeyInput;
  RevokeMyUserSessionResult: ResolverTypeWrapper<Types.RevokeMyUserSessionResult>;
  RevokeRolePermissionInput: Types.RevokeRolePermissionInput;
  RevokeUserPermissionInput: Types.RevokeUserPermissionInput;
  Role: ResolverTypeWrapper<Types.Role>;
  RoleCdmInput: Types.RoleCdmInput;
  RoleGroup: ResolverTypeWrapper<Types.RoleGroup>;
  RolePage: ResolverTypeWrapper<Types.RolePage>;
  RolePermission: ResolverTypeWrapper<Types.RolePermission>;
  RoleSearchableField: Types.RoleSearchableField;
  RoleSortInput: Types.RoleSortInput;
  RoleSortableField: Types.RoleSortableField;
  RoleTag: ResolverTypeWrapper<Types.RoleTag>;
  RotateApiKeyInput: Types.RotateApiKeyInput;
  RotateWebhookSubscriptionSecretInput: Types.RotateWebhookSubscriptionSecretInput;
  Scope: Types.Scope;
  Searchable: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Searchable']>;
  SessionExportData: ResolverTypeWrapper<Types.SessionExportData>;
  SetMyNotificationPreferenceInput: Types.SetMyNotificationPreferenceInput;
  SetMyPrimaryMfaDeviceInput: Types.SetMyPrimaryMfaDeviceInput;
  SigningKey: ResolverTypeWrapper<Types.SigningKey>;
  SortOrder: Types.SortOrder;
  StartProjectExportInput: Types.StartProjectExportInput;
  String: ResolverTypeWrapper<Types.Scalars['String']['output']>;
  SyncProjectInput: Types.SyncProjectInput;
  SyncProjectResult: ResolverTypeWrapper<Types.SyncProjectResult>;
  Tag: ResolverTypeWrapper<Types.Tag>;
  TagCdmInput: Types.TagCdmInput;
  TagPage: ResolverTypeWrapper<Types.TagPage>;
  TagSearchableField: Types.TagSearchableField;
  TagSortField: Types.TagSortField;
  TagSortInput: Types.TagSortInput;
  Tenant: Types.Tenant;
  TokenType: Types.TokenType;
  UnreadNotificationCount: ResolverTypeWrapper<Types.UnreadNotificationCount>;
  UpdateAccountProjectTagInput: Types.UpdateAccountProjectTagInput;
  UpdateAccountTagInput: Types.UpdateAccountTagInput;
  UpdateGroupInput: Types.UpdateGroupInput;
  UpdateGroupTagInput: Types.UpdateGroupTagInput;
  UpdateMyProjectMembershipInput: Types.UpdateMyProjectMembershipInput;
  UpdateMyUserAuthenticationMethodInput: Types.UpdateMyUserAuthenticationMethodInput;
  UpdateMyUserInput: Types.UpdateMyUserInput;
  UpdateOrganizationInput: Types.UpdateOrganizationInput;
  UpdateOrganizationInvitationInput: Types.UpdateOrganizationInvitationInput;
  UpdateOrganizationMemberInput: Types.UpdateOrganizationMemberInput;
  UpdateOrganizationProjectTagInput: Types.UpdateOrganizationProjectTagInput;
  UpdateOrganizationTagInput: Types.UpdateOrganizationTagInput;
  UpdatePermissionInput: Types.UpdatePermissionInput;
  UpdatePermissionTagInput: Types.UpdatePermissionTagInput;
  UpdateProjectAppInput: Types.UpdateProjectAppInput;
  UpdateProjectAppTagInput: Types.UpdateProjectAppTagInput;
  UpdateProjectInput: Types.UpdateProjectInput;
  UpdateProjectTagInput: Types.UpdateProjectTagInput;
  UpdateResourceInput: Types.UpdateResourceInput;
  UpdateResourceTagInput: Types.UpdateResourceTagInput;
  UpdateRoleInput: Types.UpdateRoleInput;
  UpdateRoleTagInput: Types.UpdateRoleTagInput;
  UpdateTagInput: Types.UpdateTagInput;
  UpdateUserAuthenticationMethodInput: Types.UpdateUserAuthenticationMethodInput;
  UpdateUserInput: Types.UpdateUserInput;
  UpdateUserSessionInput: Types.UpdateUserSessionInput;
  UpdateUserTagInput: Types.UpdateUserTagInput;
  UpdateWebhookSubscriptionMutationInput: Types.UpdateWebhookSubscriptionMutationInput;
  UploadMyProjectMembershipPictureInput: Types.UploadMyProjectMembershipPictureInput;
  UploadMyUserPictureInput: Types.UploadMyUserPictureInput;
  UploadUserPictureInput: Types.UploadUserPictureInput;
  UploadUserPictureResult: ResolverTypeWrapper<Types.UploadUserPictureResult>;
  User: ResolverTypeWrapper<Types.User>;
  UserApiKeyCdmInput: Types.UserApiKeyCdmInput;
  UserAuthenticationEmailProviderAction: Types.UserAuthenticationEmailProviderAction;
  UserAuthenticationMethod: ResolverTypeWrapper<Types.UserAuthenticationMethod>;
  UserAuthenticationMethodProvider: Types.UserAuthenticationMethodProvider;
  UserCdmInput: Types.UserCdmInput;
  UserDataExport: ResolverTypeWrapper<Types.UserDataExport>;
  UserExportData: ResolverTypeWrapper<Types.UserExportData>;
  UserGroup: ResolverTypeWrapper<Types.UserGroup>;
  UserPage: ResolverTypeWrapper<Types.UserPage>;
  UserPermission: ResolverTypeWrapper<Types.UserPermission>;
  UserRegistrationData: Types.UserRegistrationData;
  UserRole: ResolverTypeWrapper<Types.UserRole>;
  UserSearchableField: Types.UserSearchableField;
  UserSession: ResolverTypeWrapper<Types.UserSession>;
  UserSessionPage: ResolverTypeWrapper<Types.UserSessionPage>;
  UserSessionSearchableField: Types.UserSessionSearchableField;
  UserSessionSortInput: Types.UserSessionSortInput;
  UserSessionSortableField: Types.UserSessionSortableField;
  UserSortInput: Types.UserSortInput;
  UserSortableField: Types.UserSortableField;
  UserTag: ResolverTypeWrapper<Types.UserTag>;
  VerifyEmailInput: Types.VerifyEmailInput;
  VerifyEmailResponse: ResolverTypeWrapper<Types.VerifyEmailResponse>;
  VerifyMfaInput: Types.VerifyMfaInput;
  VerifyMfaRecoveryCodeInput: Types.VerifyMfaRecoveryCodeInput;
  VerifyMyMfaEnrollmentInput: Types.VerifyMyMfaEnrollmentInput;
  WebhookDeliveryAttempt: ResolverTypeWrapper<Types.WebhookDeliveryAttempt>;
  WebhookDeliveryPage: ResolverTypeWrapper<Types.WebhookDeliveryPage>;
  WebhookDeliveryStatus: Types.WebhookDeliveryStatus;
  WebhookSubscription: ResolverTypeWrapper<Types.WebhookSubscription>;
  WebhookSubscriptionWithSecret: ResolverTypeWrapper<Types.WebhookSubscriptionWithSecret>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptInvitationInput: Types.AcceptInvitationInput;
  AcceptInvitationResult: Types.AcceptInvitationResult;
  Account: Types.Account;
  AccountExportData: Types.AccountExportData;
  AccountPage: Types.AccountPage;
  AccountProject: Types.AccountProject;
  AccountProjectApiKey: Types.AccountProjectApiKey;
  AccountProjectTag: Types.AccountProjectTag;
  AccountRole: Types.AccountRole;
  AccountSortInput: Types.AccountSortInput;
  AccountTag: Types.AccountTag;
  AddAccountProjectApiKeyInput: Types.AddAccountProjectApiKeyInput;
  AddAccountProjectInput: Types.AddAccountProjectInput;
  AddAccountProjectTagInput: Types.AddAccountProjectTagInput;
  AddAccountRoleInput: Types.AddAccountRoleInput;
  AddAccountTagInput: Types.AddAccountTagInput;
  AddGroupPermissionInput: Types.AddGroupPermissionInput;
  AddGroupTagInput: Types.AddGroupTagInput;
  AddOrganizationGroupInput: Types.AddOrganizationGroupInput;
  AddOrganizationPermissionInput: Types.AddOrganizationPermissionInput;
  AddOrganizationProjectApiKeyInput: Types.AddOrganizationProjectApiKeyInput;
  AddOrganizationProjectInput: Types.AddOrganizationProjectInput;
  AddOrganizationProjectTagInput: Types.AddOrganizationProjectTagInput;
  AddOrganizationRoleInput: Types.AddOrganizationRoleInput;
  AddOrganizationTagInput: Types.AddOrganizationTagInput;
  AddOrganizationUserInput: Types.AddOrganizationUserInput;
  AddPermissionTagInput: Types.AddPermissionTagInput;
  AddProjectAppTagInput: Types.AddProjectAppTagInput;
  AddProjectGroupInput: Types.AddProjectGroupInput;
  AddProjectPermissionInput: Types.AddProjectPermissionInput;
  AddProjectResourceInput: Types.AddProjectResourceInput;
  AddProjectRoleInput: Types.AddProjectRoleInput;
  AddProjectRolePermissionInput: Types.AddProjectRolePermissionInput;
  AddProjectTagInput: Types.AddProjectTagInput;
  AddProjectUserApiKeyInput: Types.AddProjectUserApiKeyInput;
  AddProjectUserGroupInput: Types.AddProjectUserGroupInput;
  AddProjectUserInput: Types.AddProjectUserInput;
  AddProjectUserPermissionInput: Types.AddProjectUserPermissionInput;
  AddResourceTagInput: Types.AddResourceTagInput;
  AddRoleGroupInput: Types.AddRoleGroupInput;
  AddRoleTagInput: Types.AddRoleTagInput;
  AddUserGroupInput: Types.AddUserGroupInput;
  AddUserRoleInput: Types.AddUserRoleInput;
  AddUserTagInput: Types.AddUserTagInput;
  ApiKey: Types.ApiKey;
  ApiKeyPage: Types.ApiKeyPage;
  ApiKeySortInput: Types.ApiKeySortInput;
  AssignRolePermissionInput: Types.AssignRolePermissionInput;
  AssignUserPermissionInput: Types.AssignUserPermissionInput;
  Auditable: ResolversInterfaceTypes<ResolversParentTypes>['Auditable'];
  AuthenticationMethodExportData: Types.AuthenticationMethodExportData;
  AuthorizationResult: Types.AuthorizationResult;
  Boolean: Types.Scalars['Boolean']['output'];
  CdmKeyResolverInput: Types.CdmKeyResolverInput;
  CdmModeInput: Types.CdmModeInput;
  ChangeMyPasswordInput: Types.ChangeMyPasswordInput;
  ChangeMyPasswordResult: Types.ChangeMyPasswordResult;
  Creatable: ResolversInterfaceTypes<ResolversParentTypes>['Creatable'];
  CreateAccountInput: Types.CreateAccountInput;
  CreateAccountResult: Types.CreateAccountResult;
  CreateApiKeyInput: Types.CreateApiKeyInput;
  CreateApiKeyResult: Types.CreateApiKeyResult;
  CreateGroupInput: Types.CreateGroupInput;
  CreateMySecondaryAccountResult: Types.CreateMySecondaryAccountResult;
  CreateMyUserAuthenticationMethodInput: Types.CreateMyUserAuthenticationMethodInput;
  CreateOrganizationInput: Types.CreateOrganizationInput;
  CreateOrganizationInvitationInput: Types.CreateOrganizationInvitationInput;
  CreatePermissionInput: Types.CreatePermissionInput;
  CreateProjectAppInput: Types.CreateProjectAppInput;
  CreateProjectAppResult: Types.CreateProjectAppResult;
  CreateProjectInput: Types.CreateProjectInput;
  CreateResourceInput: Types.CreateResourceInput;
  CreateRoleInput: Types.CreateRoleInput;
  CreateTagInput: Types.CreateTagInput;
  CreateUserAuthenticationMethodInput: Types.CreateUserAuthenticationMethodInput;
  CreateUserInput: Types.CreateUserInput;
  CreateUserSessionInput: Types.CreateUserSessionInput;
  CreateWebhookSubscriptionMutationInput: Types.CreateWebhookSubscriptionMutationInput;
  Date: Types.Scalars['Date']['output'];
  DeleteApiKeyInput: Types.DeleteApiKeyInput;
  DeleteMyAccountsInput: Types.DeleteMyAccountsInput;
  DeleteUserAuthenticationMethodInput: Types.DeleteUserAuthenticationMethodInput;
  DeleteUserSessionInput: Types.DeleteUserSessionInput;
  DeleteWebhookSubscriptionInput: Types.DeleteWebhookSubscriptionInput;
  EmailVerificationProofInput: Types.EmailVerificationProofInput;
  ExchangeApiKeyInput: Types.ExchangeApiKeyInput;
  ExchangeApiKeyResult: Types.ExchangeApiKeyResult;
  GenerateMyMfaRecoveryCodesInput: Types.GenerateMyMfaRecoveryCodesInput;
  GetUserAuthenticationMethodsInput: Types.GetUserAuthenticationMethodsInput;
  GetUserSessionsInput: Types.GetUserSessionsInput;
  Group: Types.Group;
  GroupCdmInput: Types.GroupCdmInput;
  GroupPage: Types.GroupPage;
  GroupPermission: Types.GroupPermission;
  GroupSortInput: Types.GroupSortInput;
  GroupTag: Types.GroupTag;
  ID: Types.Scalars['ID']['output'];
  Int: Types.Scalars['Int']['output'];
  InviteMemberInput: Types.InviteMemberInput;
  IsAuthorizedContextInput: Types.IsAuthorizedContextInput;
  IsAuthorizedInput: Types.IsAuthorizedInput;
  IsAuthorizedPermissionInput: Types.IsAuthorizedPermissionInput;
  JSON: Types.Scalars['JSON']['output'];
  LoginInput: Types.LoginInput;
  LoginResponse: Types.LoginResponse;
  LogoutMyUserResponse: Types.LogoutMyUserResponse;
  MarkAllNotificationsReadResult: Types.MarkAllNotificationsReadResult;
  MeResponse: Types.MeResponse;
  MfaDevice: Types.MfaDevice;
  MfaEnrollment: Types.MfaEnrollment;
  MfaRecoveryCodeStatus: Types.MfaRecoveryCodeStatus;
  MfaSetupResponse: Types.MfaSetupResponse;
  MfaVerifyResponse: Types.MfaVerifyResponse;
  MfaVerifyResult: Types.MfaVerifyResult;
  Mutation: Record<PropertyKey, never>;
  MyNotificationsInput: Types.MyNotificationsInput;
  MyProjectMembership: Types.MyProjectMembership;
  MyUserSessionsInput: Types.MyUserSessionsInput;
  Notification: Types.Notification;
  NotificationEventScope: Types.NotificationEventScope;
  NotificationPage: Types.NotificationPage;
  NotificationPreference: Types.NotificationPreference;
  Organization: Types.Organization;
  OrganizationGroup: Types.OrganizationGroup;
  OrganizationInvitation: Types.OrganizationInvitation;
  OrganizationInvitationPage: Types.OrganizationInvitationPage;
  OrganizationInvitationSortInput: Types.OrganizationInvitationSortInput;
  OrganizationMember: Types.OrganizationMember;
  OrganizationMemberPage: Types.OrganizationMemberPage;
  OrganizationMemberSortInput: Types.OrganizationMemberSortInput;
  OrganizationMembershipExportData: Types.OrganizationMembershipExportData;
  OrganizationPage: Types.OrganizationPage;
  OrganizationPermission: Types.OrganizationPermission;
  OrganizationProject: Types.OrganizationProject;
  OrganizationProjectApiKey: Types.OrganizationProjectApiKey;
  OrganizationProjectTag: Types.OrganizationProjectTag;
  OrganizationRole: Types.OrganizationRole;
  OrganizationSortInput: Types.OrganizationSortInput;
  OrganizationTag: Types.OrganizationTag;
  OrganizationUser: Types.OrganizationUser;
  PaginatedResults: ResolversInterfaceTypes<ResolversParentTypes>['PaginatedResults'];
  Permission: Types.Permission;
  PermissionCdmInput: Types.PermissionCdmInput;
  PermissionPage: Types.PermissionPage;
  PermissionSortInput: Types.PermissionSortInput;
  PermissionTag: Types.PermissionTag;
  Project: Types.Project;
  ProjectApp: Types.ProjectApp;
  ProjectAppPage: Types.ProjectAppPage;
  ProjectAppSortInput: Types.ProjectAppSortInput;
  ProjectAppTag: Types.ProjectAppTag;
  ProjectGroup: Types.ProjectGroup;
  ProjectMembershipExportData: Types.ProjectMembershipExportData;
  ProjectPage: Types.ProjectPage;
  ProjectPermission: Types.ProjectPermission;
  ProjectResource: Types.ProjectResource;
  ProjectRole: Types.ProjectRole;
  ProjectRolePermission: Types.ProjectRolePermission;
  ProjectSortInput: Types.ProjectSortInput;
  ProjectSyncJob: Types.ProjectSyncJob;
  ProjectSyncJobPage: Types.ProjectSyncJobPage;
  ProjectSyncJobSortInput: Types.ProjectSyncJobSortInput;
  ProjectTag: Types.ProjectTag;
  ProjectUser: Types.ProjectUser;
  ProjectUserApiKey: Types.ProjectUserApiKey;
  ProjectUserGroup: Types.ProjectUserGroup;
  ProjectUserPermission: Types.ProjectUserPermission;
  Query: Record<PropertyKey, never>;
  QueryAccountProjectApiKeysInput: Types.QueryAccountProjectApiKeysInput;
  QueryAccountProjectInput: Types.QueryAccountProjectInput;
  QueryAccountProjectTagInput: Types.QueryAccountProjectTagInput;
  QueryAccountProjectsInput: Types.QueryAccountProjectsInput;
  QueryAccountRolesInput: Types.QueryAccountRolesInput;
  QueryAccountTagsInput: Types.QueryAccountTagsInput;
  QueryAccountsInput: Types.QueryAccountsInput;
  QueryGroupPermissionsInput: Types.QueryGroupPermissionsInput;
  QueryGroupTagsInput: Types.QueryGroupTagsInput;
  QueryOrganizationGroupsInput: Types.QueryOrganizationGroupsInput;
  QueryOrganizationPermissionsInput: Types.QueryOrganizationPermissionsInput;
  QueryOrganizationProjectApiKeysInput: Types.QueryOrganizationProjectApiKeysInput;
  QueryOrganizationProjectTagInput: Types.QueryOrganizationProjectTagInput;
  QueryOrganizationProjectsInput: Types.QueryOrganizationProjectsInput;
  QueryOrganizationRolesInput: Types.QueryOrganizationRolesInput;
  QueryOrganizationTagsInput: Types.QueryOrganizationTagsInput;
  QueryOrganizationUsersInput: Types.QueryOrganizationUsersInput;
  QueryPermissionTagsInput: Types.QueryPermissionTagsInput;
  QueryProjectAppTagsInput: Types.QueryProjectAppTagsInput;
  QueryProjectGroupsInput: Types.QueryProjectGroupsInput;
  QueryProjectPermissionsInput: Types.QueryProjectPermissionsInput;
  QueryProjectResourcesInput: Types.QueryProjectResourcesInput;
  QueryProjectRolePermissionsInput: Types.QueryProjectRolePermissionsInput;
  QueryProjectRolesInput: Types.QueryProjectRolesInput;
  QueryProjectTagsInput: Types.QueryProjectTagsInput;
  QueryProjectUserApiKeysInput: Types.QueryProjectUserApiKeysInput;
  QueryProjectUserGroupsInput: Types.QueryProjectUserGroupsInput;
  QueryProjectUserPermissionsInput: Types.QueryProjectUserPermissionsInput;
  QueryProjectUsersInput: Types.QueryProjectUsersInput;
  QueryResourceTagsInput: Types.QueryResourceTagsInput;
  QueryRoleGroupsInput: Types.QueryRoleGroupsInput;
  QueryRolePermissionsInput: Types.QueryRolePermissionsInput;
  QueryRoleTagsInput: Types.QueryRoleTagsInput;
  QueryUserGroupsInput: Types.QueryUserGroupsInput;
  QueryUserPermissionsInput: Types.QueryUserPermissionsInput;
  QueryUserRolesInput: Types.QueryUserRolesInput;
  QueryUserTagsInput: Types.QueryUserTagsInput;
  RefreshSessionResponse: Types.RefreshSessionResponse;
  RegisterInput: Types.RegisterInput;
  RemoveAccountProjectApiKeyInput: Types.RemoveAccountProjectApiKeyInput;
  RemoveAccountProjectInput: Types.RemoveAccountProjectInput;
  RemoveAccountProjectTagInput: Types.RemoveAccountProjectTagInput;
  RemoveAccountRoleInput: Types.RemoveAccountRoleInput;
  RemoveAccountTagInput: Types.RemoveAccountTagInput;
  RemoveGroupPermissionInput: Types.RemoveGroupPermissionInput;
  RemoveGroupTagInput: Types.RemoveGroupTagInput;
  RemoveMyMfaDeviceInput: Types.RemoveMyMfaDeviceInput;
  RemoveOrganizationGroupInput: Types.RemoveOrganizationGroupInput;
  RemoveOrganizationMemberInput: Types.RemoveOrganizationMemberInput;
  RemoveOrganizationPermissionInput: Types.RemoveOrganizationPermissionInput;
  RemoveOrganizationProjectApiKeyInput: Types.RemoveOrganizationProjectApiKeyInput;
  RemoveOrganizationProjectInput: Types.RemoveOrganizationProjectInput;
  RemoveOrganizationProjectTagInput: Types.RemoveOrganizationProjectTagInput;
  RemoveOrganizationRoleInput: Types.RemoveOrganizationRoleInput;
  RemoveOrganizationTagInput: Types.RemoveOrganizationTagInput;
  RemoveOrganizationUserInput: Types.RemoveOrganizationUserInput;
  RemovePermissionTagInput: Types.RemovePermissionTagInput;
  RemoveProjectAppTagInput: Types.RemoveProjectAppTagInput;
  RemoveProjectGroupInput: Types.RemoveProjectGroupInput;
  RemoveProjectPermissionInput: Types.RemoveProjectPermissionInput;
  RemoveProjectResourceInput: Types.RemoveProjectResourceInput;
  RemoveProjectRoleInput: Types.RemoveProjectRoleInput;
  RemoveProjectRolePermissionInput: Types.RemoveProjectRolePermissionInput;
  RemoveProjectTagInput: Types.RemoveProjectTagInput;
  RemoveProjectUserApiKeyInput: Types.RemoveProjectUserApiKeyInput;
  RemoveProjectUserGroupInput: Types.RemoveProjectUserGroupInput;
  RemoveProjectUserInput: Types.RemoveProjectUserInput;
  RemoveProjectUserPermissionInput: Types.RemoveProjectUserPermissionInput;
  RemoveResourceTagInput: Types.RemoveResourceTagInput;
  RemoveRoleGroupInput: Types.RemoveRoleGroupInput;
  RemoveRoleTagInput: Types.RemoveRoleTagInput;
  RemoveUserGroupInput: Types.RemoveUserGroupInput;
  RemoveUserRoleInput: Types.RemoveUserRoleInput;
  RemoveUserTagInput: Types.RemoveUserTagInput;
  ReplayWebhookDeliveryInput: Types.ReplayWebhookDeliveryInput;
  RequestPasswordResetInput: Types.RequestPasswordResetInput;
  RequestPasswordResetResponse: Types.RequestPasswordResetResponse;
  ResendVerificationInput: Types.ResendVerificationInput;
  ResendVerificationResponse: Types.ResendVerificationResponse;
  ResetPasswordInput: Types.ResetPasswordInput;
  ResetPasswordResponse: Types.ResetPasswordResponse;
  Resource: Types.Resource;
  ResourceCdmInput: Types.ResourceCdmInput;
  ResourcePage: Types.ResourcePage;
  ResourceSortInput: Types.ResourceSortInput;
  ResourceTag: Types.ResourceTag;
  RevokeApiKeyInput: Types.RevokeApiKeyInput;
  RevokeMyUserSessionResult: Types.RevokeMyUserSessionResult;
  RevokeRolePermissionInput: Types.RevokeRolePermissionInput;
  RevokeUserPermissionInput: Types.RevokeUserPermissionInput;
  Role: Types.Role;
  RoleCdmInput: Types.RoleCdmInput;
  RoleGroup: Types.RoleGroup;
  RolePage: Types.RolePage;
  RolePermission: Types.RolePermission;
  RoleSortInput: Types.RoleSortInput;
  RoleTag: Types.RoleTag;
  RotateApiKeyInput: Types.RotateApiKeyInput;
  RotateWebhookSubscriptionSecretInput: Types.RotateWebhookSubscriptionSecretInput;
  Scope: Types.Scope;
  Searchable: ResolversInterfaceTypes<ResolversParentTypes>['Searchable'];
  SessionExportData: Types.SessionExportData;
  SetMyNotificationPreferenceInput: Types.SetMyNotificationPreferenceInput;
  SetMyPrimaryMfaDeviceInput: Types.SetMyPrimaryMfaDeviceInput;
  SigningKey: Types.SigningKey;
  StartProjectExportInput: Types.StartProjectExportInput;
  String: Types.Scalars['String']['output'];
  SyncProjectInput: Types.SyncProjectInput;
  SyncProjectResult: Types.SyncProjectResult;
  Tag: Types.Tag;
  TagCdmInput: Types.TagCdmInput;
  TagPage: Types.TagPage;
  TagSortInput: Types.TagSortInput;
  UnreadNotificationCount: Types.UnreadNotificationCount;
  UpdateAccountProjectTagInput: Types.UpdateAccountProjectTagInput;
  UpdateAccountTagInput: Types.UpdateAccountTagInput;
  UpdateGroupInput: Types.UpdateGroupInput;
  UpdateGroupTagInput: Types.UpdateGroupTagInput;
  UpdateMyProjectMembershipInput: Types.UpdateMyProjectMembershipInput;
  UpdateMyUserAuthenticationMethodInput: Types.UpdateMyUserAuthenticationMethodInput;
  UpdateMyUserInput: Types.UpdateMyUserInput;
  UpdateOrganizationInput: Types.UpdateOrganizationInput;
  UpdateOrganizationInvitationInput: Types.UpdateOrganizationInvitationInput;
  UpdateOrganizationMemberInput: Types.UpdateOrganizationMemberInput;
  UpdateOrganizationProjectTagInput: Types.UpdateOrganizationProjectTagInput;
  UpdateOrganizationTagInput: Types.UpdateOrganizationTagInput;
  UpdatePermissionInput: Types.UpdatePermissionInput;
  UpdatePermissionTagInput: Types.UpdatePermissionTagInput;
  UpdateProjectAppInput: Types.UpdateProjectAppInput;
  UpdateProjectAppTagInput: Types.UpdateProjectAppTagInput;
  UpdateProjectInput: Types.UpdateProjectInput;
  UpdateProjectTagInput: Types.UpdateProjectTagInput;
  UpdateResourceInput: Types.UpdateResourceInput;
  UpdateResourceTagInput: Types.UpdateResourceTagInput;
  UpdateRoleInput: Types.UpdateRoleInput;
  UpdateRoleTagInput: Types.UpdateRoleTagInput;
  UpdateTagInput: Types.UpdateTagInput;
  UpdateUserAuthenticationMethodInput: Types.UpdateUserAuthenticationMethodInput;
  UpdateUserInput: Types.UpdateUserInput;
  UpdateUserSessionInput: Types.UpdateUserSessionInput;
  UpdateUserTagInput: Types.UpdateUserTagInput;
  UpdateWebhookSubscriptionMutationInput: Types.UpdateWebhookSubscriptionMutationInput;
  UploadMyProjectMembershipPictureInput: Types.UploadMyProjectMembershipPictureInput;
  UploadMyUserPictureInput: Types.UploadMyUserPictureInput;
  UploadUserPictureInput: Types.UploadUserPictureInput;
  UploadUserPictureResult: Types.UploadUserPictureResult;
  User: Types.User;
  UserApiKeyCdmInput: Types.UserApiKeyCdmInput;
  UserAuthenticationMethod: Types.UserAuthenticationMethod;
  UserCdmInput: Types.UserCdmInput;
  UserDataExport: Types.UserDataExport;
  UserExportData: Types.UserExportData;
  UserGroup: Types.UserGroup;
  UserPage: Types.UserPage;
  UserPermission: Types.UserPermission;
  UserRegistrationData: Types.UserRegistrationData;
  UserRole: Types.UserRole;
  UserSession: Types.UserSession;
  UserSessionPage: Types.UserSessionPage;
  UserSessionSortInput: Types.UserSessionSortInput;
  UserSortInput: Types.UserSortInput;
  UserTag: Types.UserTag;
  VerifyEmailInput: Types.VerifyEmailInput;
  VerifyEmailResponse: Types.VerifyEmailResponse;
  VerifyMfaInput: Types.VerifyMfaInput;
  VerifyMfaRecoveryCodeInput: Types.VerifyMfaRecoveryCodeInput;
  VerifyMyMfaEnrollmentInput: Types.VerifyMyMfaEnrollmentInput;
  WebhookDeliveryAttempt: Types.WebhookDeliveryAttempt;
  WebhookDeliveryPage: Types.WebhookDeliveryPage;
  WebhookSubscription: Types.WebhookSubscription;
  WebhookSubscriptionWithSecret: Types.WebhookSubscriptionWithSecret;
}>;

export type AcceptInvitationResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AcceptInvitationResult'] =
    ResolversParentTypes['AcceptInvitationResult'],
> = ResolversObject<{
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  invitation?: Resolver<
    Types.Maybe<ResolversTypes['OrganizationInvitation']>,
    ParentType,
    ContextType
  >;
  isNewUser?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  requiresRegistration?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type AccountResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Account'] = ResolversParentTypes['Account'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  ownerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projects?: Resolver<Types.Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AccountType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountExportData'] =
    ResolversParentTypes['AccountExportData'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AccountType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
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
  ParentType extends ResolversParentTypes['AccountProject'] =
    ResolversParentTypes['AccountProject'],
> = ResolversObject<{
  account?: Resolver<Types.Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountProjectApiKeyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountProjectApiKey'] =
    ResolversParentTypes['AccountProjectApiKey'],
> = ResolversObject<{
  account?: Resolver<Types.Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  accountRoleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  apiKey?: Resolver<Types.Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  apiKeyId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountProjectTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountProjectTag'] =
    ResolversParentTypes['AccountProjectTag'],
> = ResolversObject<{
  account?: Resolver<Types.Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountRole'] = ResolversParentTypes['AccountRole'],
> = ResolversObject<{
  account?: Resolver<Types.Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AccountTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AccountTag'] = ResolversParentTypes['AccountTag'],
> = ResolversObject<{
  account?: Resolver<Types.Maybe<ResolversTypes['Account']>, ParentType, ContextType>;
  accountId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey'],
> = ResolversObject<{
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdByUser?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  expiresAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isRevoked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  name?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revokedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  revokedBy?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  revokedByUser?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ApiKeyPage'] = ResolversParentTypes['ApiKeyPage'],
> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditableResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Auditable'] = ResolversParentTypes['Auditable'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'Account'
    | 'AccountProject'
    | 'AccountProjectApiKey'
    | 'AccountProjectTag'
    | 'AccountRole'
    | 'AccountTag'
    | 'ApiKey'
    | 'Group'
    | 'GroupPermission'
    | 'GroupTag'
    | 'Organization'
    | 'OrganizationGroup'
    | 'OrganizationInvitation'
    | 'OrganizationPermission'
    | 'OrganizationProject'
    | 'OrganizationProjectApiKey'
    | 'OrganizationProjectTag'
    | 'OrganizationRole'
    | 'OrganizationTag'
    | 'OrganizationUser'
    | 'Permission'
    | 'PermissionTag'
    | 'Project'
    | 'ProjectApp'
    | 'ProjectAppTag'
    | 'ProjectGroup'
    | 'ProjectPermission'
    | 'ProjectResource'
    | 'ProjectRole'
    | 'ProjectRolePermission'
    | 'ProjectTag'
    | 'ProjectUser'
    | 'ProjectUserApiKey'
    | 'ProjectUserGroup'
    | 'ProjectUserPermission'
    | 'Resource'
    | 'ResourceTag'
    | 'Role'
    | 'RoleGroup'
    | 'RolePermission'
    | 'RoleTag'
    | 'SigningKey'
    | 'Tag'
    | 'User'
    | 'UserAuthenticationMethod'
    | 'UserGroup'
    | 'UserPermission'
    | 'UserRole'
    | 'UserSession'
    | 'UserTag',
    ParentType,
    ContextType
  >;
}>;

export type AuthenticationMethodExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthenticationMethodExportData'] =
    ResolversParentTypes['AuthenticationMethodExportData'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type AuthorizationResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthorizationResult'] =
    ResolversParentTypes['AuthorizationResult'],
> = ResolversObject<{
  authorized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  evaluatedContext?: Resolver<Types.Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  matchedCondition?: Resolver<Types.Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  matchedPermission?: Resolver<Types.Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  reason?: Resolver<Types.Maybe<ResolversTypes['AuthorizationReason']>, ParentType, ContextType>;
}>;

export type ChangeMyPasswordResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ChangeMyPasswordResult'] =
    ResolversParentTypes['ChangeMyPasswordResult'],
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
  ParentType extends ResolversParentTypes['CreateAccountResult'] =
    ResolversParentTypes['CreateAccountResult'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  email?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requiresEmailVerification?: Resolver<
    Types.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  verificationExpiry?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type CreateApiKeyResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CreateApiKeyResult'] =
    ResolversParentTypes['CreateApiKeyResult'],
> = ResolversObject<{
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  clientSecret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  expiresAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type CreateMySecondaryAccountResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CreateMySecondaryAccountResult'] =
    ResolversParentTypes['CreateMySecondaryAccountResult'],
> = ResolversObject<{
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
}>;

export type CreateProjectAppResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CreateProjectAppResult'] =
    ResolversParentTypes['CreateProjectAppResult'],
> = ResolversObject<{
  allowSignUp?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  clientSecret?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  enabledProviders?: Resolver<
    Types.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redirectUris?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  signUpRoleId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type ExchangeApiKeyResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ExchangeApiKeyResult'] =
    ResolversParentTypes['ExchangeApiKeyResult'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Group'] = ResolversParentTypes['Group'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  permissions?: Resolver<Types.Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  primaryTag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
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
  ParentType extends ResolversParentTypes['GroupPermission'] =
    ResolversParentTypes['GroupPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Types.Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<Types.GroupPermissionGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<
    Types.Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<Types.GroupPermissionPermissionArgs, 'scope'>
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
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Types.Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<Types.GroupTagGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<
    Types.Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<Types.GroupTagTagArgs, 'scope'>
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
  email?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mfaVerified?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  requiresEmailVerification?: Resolver<
    Types.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  requiresMfaStepUp?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  verificationExpiry?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type LogoutMyUserResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['LogoutMyUserResponse'] =
    ResolversParentTypes['LogoutMyUserResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MarkAllNotificationsReadResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MarkAllNotificationsReadResult'] =
    ResolversParentTypes['MarkAllNotificationsReadResult'],
> = ResolversObject<{
  updated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MeResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MeResponse'] = ResolversParentTypes['MeResponse'],
> = ResolversObject<{
  accounts?: Resolver<Array<ResolversTypes['Account']>, ParentType, ContextType>;
  email?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mfaVerified?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  requiresEmailVerification?: Resolver<
    Types.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  verificationExpiry?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type MfaDeviceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaDevice'] = ResolversParentTypes['MfaDevice'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MfaEnrollmentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaEnrollment'] = ResolversParentTypes['MfaEnrollment'],
> = ResolversObject<{
  factorId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  otpAuthUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  secret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MfaRecoveryCodeStatusResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaRecoveryCodeStatus'] =
    ResolversParentTypes['MfaRecoveryCodeStatus'],
> = ResolversObject<{
  activeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastGeneratedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
}>;

export type MfaSetupResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaSetupResponse'] =
    ResolversParentTypes['MfaSetupResponse'],
> = ResolversObject<{
  factorId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  otpAuthUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  secret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MfaVerifyResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaVerifyResponse'] =
    ResolversParentTypes['MfaVerifyResponse'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mfaVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MfaVerifyResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MfaVerifyResult'] =
    ResolversParentTypes['MfaVerifyResult'],
> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type MutationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  _empty?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  acceptInvitation?: Resolver<
    ResolversTypes['AcceptInvitationResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationAcceptInvitationArgs, 'input'>
  >;
  assignRolePermission?: Resolver<
    ResolversTypes['RolePermission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationAssignRolePermissionArgs, 'input'>
  >;
  assignUserPermission?: Resolver<
    ResolversTypes['UserPermission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationAssignUserPermissionArgs, 'input'>
  >;
  cancelProjectSync?: Resolver<
    ResolversTypes['ProjectSyncJob'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCancelProjectSyncArgs, 'id' | 'jobId' | 'scope'>
  >;
  changeMyPassword?: Resolver<
    ResolversTypes['ChangeMyPasswordResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationChangeMyPasswordArgs, 'input'>
  >;
  createApiKey?: Resolver<
    ResolversTypes['CreateApiKeyResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateApiKeyArgs, 'input'>
  >;
  createGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateGroupArgs, 'input'>
  >;
  createMyMfaEnrollment?: Resolver<ResolversTypes['MfaEnrollment'], ParentType, ContextType>;
  createMySecondaryAccount?: Resolver<
    ResolversTypes['CreateMySecondaryAccountResult'],
    ParentType,
    ContextType
  >;
  createMyUserAuthenticationMethod?: Resolver<
    ResolversTypes['UserAuthenticationMethod'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateMyUserAuthenticationMethodArgs, 'input'>
  >;
  createOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateOrganizationArgs, 'input'>
  >;
  createPermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreatePermissionArgs, 'input'>
  >;
  createProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateProjectArgs, 'input'>
  >;
  createProjectApp?: Resolver<
    ResolversTypes['CreateProjectAppResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateProjectAppArgs, 'input'>
  >;
  createResource?: Resolver<
    ResolversTypes['Resource'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateResourceArgs, 'input'>
  >;
  createRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateRoleArgs, 'input'>
  >;
  createTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateTagArgs, 'input'>
  >;
  createUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateUserArgs, 'input'>
  >;
  createWebhookSubscription?: Resolver<
    ResolversTypes['WebhookSubscriptionWithSecret'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationCreateWebhookSubscriptionArgs, 'input'>
  >;
  deleteApiKey?: Resolver<
    ResolversTypes['ApiKey'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteApiKeyArgs, 'input'>
  >;
  deleteGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteGroupArgs, 'id' | 'scope'>
  >;
  deleteMyAccounts?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteMyAccountsArgs, 'input'>
  >;
  deleteMyUserAuthenticationMethod?: Resolver<
    ResolversTypes['UserAuthenticationMethod'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteMyUserAuthenticationMethodArgs, 'id'>
  >;
  deleteOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteOrganizationArgs, 'id' | 'scope'>
  >;
  deletePermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeletePermissionArgs, 'id' | 'scope'>
  >;
  deleteProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteProjectArgs, 'id' | 'scope'>
  >;
  deleteProjectApp?: Resolver<
    ResolversTypes['ProjectApp'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteProjectAppArgs, 'id' | 'scope'>
  >;
  deleteResource?: Resolver<
    ResolversTypes['Resource'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteResourceArgs, 'id' | 'scope'>
  >;
  deleteRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteRoleArgs, 'id' | 'scope'>
  >;
  deleteTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteTagArgs, 'id' | 'scope'>
  >;
  deleteUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteUserArgs, 'id' | 'scope'>
  >;
  deleteWebhookSubscription?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationDeleteWebhookSubscriptionArgs, 'input'>
  >;
  exchangeApiKey?: Resolver<
    ResolversTypes['ExchangeApiKeyResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationExchangeApiKeyArgs, 'input'>
  >;
  generateMyMfaRecoveryCodes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType,
    Partial<Types.MutationGenerateMyMfaRecoveryCodesArgs>
  >;
  inviteMember?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationInviteMemberArgs, 'input'>
  >;
  login?: Resolver<
    ResolversTypes['LoginResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationLoginArgs, 'input'>
  >;
  logoutMyUser?: Resolver<ResolversTypes['LogoutMyUserResponse'], ParentType, ContextType>;
  markAllMyNotificationsRead?: Resolver<
    ResolversTypes['MarkAllNotificationsReadResult'],
    ParentType,
    ContextType
  >;
  markMyNotificationRead?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationMarkMyNotificationReadArgs, 'id'>
  >;
  refreshSession?: Resolver<ResolversTypes['RefreshSessionResponse'], ParentType, ContextType>;
  register?: Resolver<
    ResolversTypes['CreateAccountResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRegisterArgs, 'input'>
  >;
  removeMyMfaDevice?: Resolver<
    ResolversTypes['MfaVerifyResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRemoveMyMfaDeviceArgs, 'input'>
  >;
  removeOrganizationMember?: Resolver<
    ResolversTypes['OrganizationMember'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRemoveOrganizationMemberArgs, 'input' | 'userId'>
  >;
  renewInvitation?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRenewInvitationArgs, 'id' | 'scope'>
  >;
  replayWebhookDelivery?: Resolver<
    ResolversTypes['WebhookDeliveryAttempt'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationReplayWebhookDeliveryArgs, 'input'>
  >;
  requestPasswordReset?: Resolver<
    ResolversTypes['RequestPasswordResetResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRequestPasswordResetArgs, 'input'>
  >;
  resendInvitationEmail?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationResendInvitationEmailArgs, 'id' | 'scope'>
  >;
  resendVerification?: Resolver<
    ResolversTypes['ResendVerificationResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationResendVerificationArgs, 'input'>
  >;
  resetPassword?: Resolver<
    ResolversTypes['ResetPasswordResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationResetPasswordArgs, 'input'>
  >;
  revokeApiKey?: Resolver<
    ResolversTypes['ApiKey'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRevokeApiKeyArgs, 'input'>
  >;
  revokeInvitation?: Resolver<
    ResolversTypes['OrganizationInvitation'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRevokeInvitationArgs, 'id' | 'scope'>
  >;
  revokeMyUserSession?: Resolver<
    ResolversTypes['RevokeMyUserSessionResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRevokeMyUserSessionArgs, 'id'>
  >;
  revokeRolePermission?: Resolver<
    ResolversTypes['RolePermission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRevokeRolePermissionArgs, 'input'>
  >;
  revokeUserPermission?: Resolver<
    ResolversTypes['UserPermission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRevokeUserPermissionArgs, 'input'>
  >;
  rotateApiKey?: Resolver<
    ResolversTypes['CreateApiKeyResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRotateApiKeyArgs, 'input'>
  >;
  rotateSigningKey?: Resolver<
    ResolversTypes['SigningKey'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRotateSigningKeyArgs, 'scope'>
  >;
  rotateWebhookSubscriptionSecret?: Resolver<
    ResolversTypes['WebhookSubscriptionWithSecret'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationRotateWebhookSubscriptionSecretArgs, 'input'>
  >;
  setMyNotificationPreference?: Resolver<
    ResolversTypes['NotificationPreference'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationSetMyNotificationPreferenceArgs, 'input'>
  >;
  setMyPrimaryAuthenticationMethod?: Resolver<
    ResolversTypes['UserAuthenticationMethod'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationSetMyPrimaryAuthenticationMethodArgs, 'id'>
  >;
  setMyPrimaryMfaDevice?: Resolver<
    ResolversTypes['MfaDevice'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationSetMyPrimaryMfaDeviceArgs, 'input'>
  >;
  setupMfa?: Resolver<ResolversTypes['MfaSetupResponse'], ParentType, ContextType>;
  startProjectExport?: Resolver<
    ResolversTypes['ProjectSyncJob'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationStartProjectExportArgs, 'id' | 'input' | 'scope'>
  >;
  startProjectSync?: Resolver<
    ResolversTypes['ProjectSyncJob'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationStartProjectSyncArgs, 'id' | 'input' | 'scope'>
  >;
  updateGroup?: Resolver<
    ResolversTypes['Group'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateGroupArgs, 'id' | 'input'>
  >;
  updateMyProjectMembership?: Resolver<
    ResolversTypes['MyProjectMembership'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateMyProjectMembershipArgs, 'input'>
  >;
  updateMyUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateMyUserArgs, 'input'>
  >;
  updateOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateOrganizationArgs, 'id' | 'input'>
  >;
  updateOrganizationMember?: Resolver<
    ResolversTypes['OrganizationMember'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateOrganizationMemberArgs, 'input' | 'userId'>
  >;
  updatePermission?: Resolver<
    ResolversTypes['Permission'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdatePermissionArgs, 'id' | 'input'>
  >;
  updateProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateProjectArgs, 'id' | 'input'>
  >;
  updateProjectApp?: Resolver<
    ResolversTypes['ProjectApp'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateProjectAppArgs, 'id' | 'input'>
  >;
  updateResource?: Resolver<
    ResolversTypes['Resource'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateResourceArgs, 'id' | 'input'>
  >;
  updateRole?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateRoleArgs, 'id' | 'input'>
  >;
  updateTag?: Resolver<
    ResolversTypes['Tag'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateTagArgs, 'id' | 'input'>
  >;
  updateUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateUserArgs, 'id' | 'input'>
  >;
  updateWebhookSubscription?: Resolver<
    ResolversTypes['WebhookSubscription'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUpdateWebhookSubscriptionArgs, 'id' | 'input'>
  >;
  uploadMyProjectMembershipPicture?: Resolver<
    ResolversTypes['UploadUserPictureResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUploadMyProjectMembershipPictureArgs, 'input'>
  >;
  uploadMyUserPicture?: Resolver<
    ResolversTypes['UploadUserPictureResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUploadMyUserPictureArgs, 'input'>
  >;
  uploadUserPicture?: Resolver<
    ResolversTypes['UploadUserPictureResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationUploadUserPictureArgs, 'input'>
  >;
  verifyEmail?: Resolver<
    ResolversTypes['VerifyEmailResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationVerifyEmailArgs, 'input'>
  >;
  verifyMfa?: Resolver<
    ResolversTypes['MfaVerifyResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationVerifyMfaArgs, 'input'>
  >;
  verifyMfaRecoveryCode?: Resolver<
    ResolversTypes['MfaVerifyResponse'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationVerifyMfaRecoveryCodeArgs, 'input'>
  >;
  verifyMyMfaEnrollment?: Resolver<
    ResolversTypes['MfaVerifyResult'],
    ParentType,
    ContextType,
    RequireFields<Types.MutationVerifyMyMfaEnrollmentArgs, 'input'>
  >;
}>;

export type MyProjectMembershipResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MyProjectMembership'] =
    ResolversParentTypes['MyProjectMembership'],
> = ResolversObject<{
  accountId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  displayName?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  organizationId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  organizationName?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pictureUrl?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NotificationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Notification'] = ResolversParentTypes['Notification'],
> = ResolversObject<{
  body?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['NotificationChannel'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  eventId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  readAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  refEntity?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  refId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  scope?: Resolver<Types.Maybe<ResolversTypes['NotificationEventScope']>, ParentType, ContextType>;
  seenAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NotificationStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NotificationEventScopeResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['NotificationEventScope'] =
    ResolversParentTypes['NotificationEventScope'],
> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tenant?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NotificationPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['NotificationPage'] =
    ResolversParentTypes['NotificationPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  notifications?: Resolver<Array<ResolversTypes['Notification']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type NotificationPreferenceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['NotificationPreference'] =
    ResolversParentTypes['NotificationPreference'],
> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['NotificationChannel'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  scopeId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  scopeTenant?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['NotificationPreferenceSource'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  groups?: Resolver<Types.Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Types.Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  projects?: Resolver<Types.Maybe<Array<ResolversTypes['Project']>>, ParentType, ContextType>;
  requireMfaForSensitiveActions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roles?: Resolver<Types.Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Types.Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationGroup'] =
    ResolversParentTypes['OrganizationGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Types.Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationInvitationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationInvitation'] =
    ResolversParentTypes['OrganizationInvitation'],
> = ResolversObject<{
  acceptedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invitedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
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
  ParentType extends ResolversParentTypes['OrganizationInvitationPage'] =
    ResolversParentTypes['OrganizationInvitationPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  invitations?: Resolver<Array<ResolversTypes['OrganizationInvitation']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrganizationMemberResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationMember'] =
    ResolversParentTypes['OrganizationMember'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  email?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  invitation?: Resolver<
    Types.Maybe<ResolversTypes['OrganizationInvitation']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  status?: Resolver<
    Types.Maybe<ResolversTypes['OrganizationInvitationStatus']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['MemberType'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type OrganizationMemberPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationMemberPage'] =
    ResolversParentTypes['OrganizationMemberPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['OrganizationMember']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OrganizationMembershipExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationMembershipExportData'] =
    ResolversParentTypes['OrganizationMembershipExportData'],
> = ResolversObject<{
  joinedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organizationName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type OrganizationPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationPage'] =
    ResolversParentTypes['OrganizationPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationPermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationPermission'] =
    ResolversParentTypes['OrganizationPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Types.Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationProject'] =
    ResolversParentTypes['OrganizationProject'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectApiKeyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationProjectApiKey'] =
    ResolversParentTypes['OrganizationProjectApiKey'],
> = ResolversObject<{
  apiKey?: Resolver<Types.Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  apiKeyId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organizationRoleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationProjectTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationProjectTag'] =
    ResolversParentTypes['OrganizationProjectTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationRole'] =
    ResolversParentTypes['OrganizationRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationTag'] =
    ResolversParentTypes['OrganizationTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationUserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationUser'] =
    ResolversParentTypes['OrganizationUser'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<Types.Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PaginatedResultsResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PaginatedResults'] =
    ResolversParentTypes['PaginatedResults'],
> = ResolversObject<{
  __resolveType: TypeResolveFn<
    | 'AccountPage'
    | 'ApiKeyPage'
    | 'GroupPage'
    | 'OrganizationPage'
    | 'PermissionPage'
    | 'ProjectAppPage'
    | 'ProjectPage'
    | 'ProjectSyncJobPage'
    | 'ResourcePage'
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
  condition?: Resolver<Types.Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  primaryTag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  resource?: Resolver<Types.Maybe<ResolversTypes['Resource']>, ParentType, ContextType>;
  resourceId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  tagCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermissionPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PermissionPage'] =
    ResolversParentTypes['PermissionPage'],
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
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permission?: Resolver<
    Types.Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<Types.PermissionTagPermissionArgs, 'scope'>
  >;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<
    Types.Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<Types.PermissionTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project'],
> = ResolversObject<{
  accountTags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groups?: Resolver<Types.Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organizationTags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  permissions?: Resolver<Types.Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  resources?: Resolver<Types.Maybe<Array<ResolversTypes['Resource']>>, ParentType, ContextType>;
  roles?: Resolver<Types.Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  users?: Resolver<Types.Maybe<Array<ResolversTypes['User']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectAppResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectApp'] = ResolversParentTypes['ProjectApp'],
> = ResolversObject<{
  allowSignUp?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  enabledProviders?: Resolver<
    Types.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  redirectUris?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  scopes?: Resolver<Types.Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  signUpRole?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  signUpRoleId?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectAppPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectAppPage'] =
    ResolversParentTypes['ProjectAppPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projectApps?: Resolver<Array<ResolversTypes['ProjectApp']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectAppTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectAppTag'] = ResolversParentTypes['ProjectAppTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  projectAppId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectGroup'] = ResolversParentTypes['ProjectGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<Types.Maybe<ResolversTypes['Group']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Types.Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<Types.ProjectGroupProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMembershipExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectMembershipExportData'] =
    ResolversParentTypes['ProjectMembershipExportData'],
> = ResolversObject<{
  joinedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  ParentType extends ResolversParentTypes['ProjectPermission'] =
    ResolversParentTypes['ProjectPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<Types.Maybe<ResolversTypes['Permission']>, ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Types.Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<Types.ProjectPermissionProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectResourceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectResource'] =
    ResolversParentTypes['ProjectResource'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  resource?: Resolver<Types.Maybe<ResolversTypes['Resource']>, ParentType, ContextType>;
  resourceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectRole'] = ResolversParentTypes['ProjectRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<
    Types.Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<Types.ProjectRoleProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<Types.Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectRolePermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectRolePermission'] =
    ResolversParentTypes['ProjectRolePermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectSyncJobResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectSyncJob'] =
    ResolversParentTypes['ProjectSyncJob'],
> = ResolversObject<{
  cancelledAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  cdmVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  enqueuedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  errorMessage?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasSnapshot?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobName?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  modeStrategy?: Resolver<Types.Maybe<ResolversTypes['CdmModeStrategy']>, ParentType, ContextType>;
  operation?: Resolver<ResolversTypes['ProjectSyncJobOperation'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  result?: Resolver<Types.Maybe<ResolversTypes['SyncProjectResult']>, ParentType, ContextType>;
  snapshotSizeBytes?: Resolver<Types.Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  snapshotTakenAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  startedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProjectSyncJobStatus'], ParentType, ContextType>;
  warnings?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ProjectSyncJobPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectSyncJobPage'] =
    ResolversParentTypes['ProjectSyncJobPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  jobs?: Resolver<Array<ResolversTypes['ProjectSyncJob']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectTag'] = ResolversParentTypes['ProjectTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  project?: Resolver<
    Types.Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<Types.ProjectTagProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectUser'] = ResolversParentTypes['ProjectUser'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  displayName?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  pictureUrl?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  project?: Resolver<
    Types.Maybe<ResolversTypes['Project']>,
    ParentType,
    ContextType,
    RequireFields<Types.ProjectUserProjectArgs, 'organizationId'>
  >;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserApiKeyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectUserApiKey'] =
    ResolversParentTypes['ProjectUserApiKey'],
> = ResolversObject<{
  apiKey?: Resolver<Types.Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  apiKeyId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  project?: Resolver<Types.Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectUserGroup'] =
    ResolversParentTypes['ProjectUserGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUserPermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProjectUserPermission'] =
    ResolversParentTypes['ProjectUserPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  _empty?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  apiKeys?: Resolver<
    ResolversTypes['ApiKeyPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryApiKeysArgs, 'scope'>
  >;
  groups?: Resolver<
    ResolversTypes['GroupPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryGroupsArgs, 'scope'>
  >;
  invitation?: Resolver<
    Types.Maybe<ResolversTypes['OrganizationInvitation']>,
    ParentType,
    ContextType,
    RequireFields<Types.QueryInvitationArgs, 'token'>
  >;
  isAuthorized?: Resolver<
    ResolversTypes['AuthorizationResult'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryIsAuthorizedArgs, 'input'>
  >;
  me?: Resolver<ResolversTypes['MeResponse'], ParentType, ContextType>;
  myMfaDevices?: Resolver<Array<ResolversTypes['MfaDevice']>, ParentType, ContextType>;
  myMfaRecoveryCodeStatus?: Resolver<
    ResolversTypes['MfaRecoveryCodeStatus'],
    ParentType,
    ContextType
  >;
  myNotificationPreferences?: Resolver<
    Array<ResolversTypes['NotificationPreference']>,
    ParentType,
    ContextType,
    RequireFields<Types.QueryMyNotificationPreferencesArgs, 'scopeTenant'>
  >;
  myNotifications?: Resolver<
    ResolversTypes['NotificationPage'],
    ParentType,
    ContextType,
    Partial<Types.QueryMyNotificationsArgs>
  >;
  myProjectMembership?: Resolver<
    Types.Maybe<ResolversTypes['MyProjectMembership']>,
    ParentType,
    ContextType,
    RequireFields<Types.QueryMyProjectMembershipArgs, 'projectId'>
  >;
  myProjectMemberships?: Resolver<
    Array<ResolversTypes['MyProjectMembership']>,
    ParentType,
    ContextType
  >;
  myUnreadNotificationCount?: Resolver<
    ResolversTypes['UnreadNotificationCount'],
    ParentType,
    ContextType
  >;
  myUserAuthenticationMethods?: Resolver<
    Array<ResolversTypes['UserAuthenticationMethod']>,
    ParentType,
    ContextType
  >;
  myUserDataExport?: Resolver<ResolversTypes['UserDataExport'], ParentType, ContextType>;
  myUserSessions?: Resolver<
    ResolversTypes['UserSessionPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryMyUserSessionsArgs, 'input'>
  >;
  organizationInvitations?: Resolver<
    ResolversTypes['OrganizationInvitationPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryOrganizationInvitationsArgs, 'scope'>
  >;
  organizationMembers?: Resolver<
    ResolversTypes['OrganizationMemberPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryOrganizationMembersArgs, 'scope'>
  >;
  organizations?: Resolver<
    ResolversTypes['OrganizationPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryOrganizationsArgs, 'scope'>
  >;
  permissions?: Resolver<
    ResolversTypes['PermissionPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryPermissionsArgs, 'scope'>
  >;
  projectApps?: Resolver<
    ResolversTypes['ProjectAppPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryProjectAppsArgs, 'scope'>
  >;
  projectSyncJob?: Resolver<
    ResolversTypes['ProjectSyncJob'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryProjectSyncJobArgs, 'id' | 'jobId' | 'scope'>
  >;
  projectSyncJobs?: Resolver<
    ResolversTypes['ProjectSyncJobPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryProjectSyncJobsArgs, 'id' | 'scope'>
  >;
  projects?: Resolver<
    ResolversTypes['ProjectPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryProjectsArgs, 'scope'>
  >;
  resources?: Resolver<
    ResolversTypes['ResourcePage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryResourcesArgs, 'scope'>
  >;
  roles?: Resolver<
    ResolversTypes['RolePage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryRolesArgs, 'scope'>
  >;
  signingKeys?: Resolver<
    Array<ResolversTypes['SigningKey']>,
    ParentType,
    ContextType,
    RequireFields<Types.QuerySigningKeysArgs, 'scope'>
  >;
  tags?: Resolver<
    ResolversTypes['TagPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryTagsArgs, 'scope'>
  >;
  users?: Resolver<
    ResolversTypes['UserPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryUsersArgs, 'scope'>
  >;
  webhookDeliveries?: Resolver<
    ResolversTypes['WebhookDeliveryPage'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryWebhookDeliveriesArgs, 'scope'>
  >;
  webhookSubscription?: Resolver<
    ResolversTypes['WebhookSubscription'],
    ParentType,
    ContextType,
    RequireFields<Types.QueryWebhookSubscriptionArgs, 'id' | 'scope'>
  >;
  webhookSubscriptions?: Resolver<
    Array<ResolversTypes['WebhookSubscription']>,
    ParentType,
    ContextType,
    RequireFields<Types.QueryWebhookSubscriptionsArgs, 'scope'>
  >;
}>;

export type RefreshSessionResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RefreshSessionResponse'] =
    ResolversParentTypes['RefreshSessionResponse'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RequestPasswordResetResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RequestPasswordResetResponse'] =
    ResolversParentTypes['RequestPasswordResetResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ResendVerificationResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ResendVerificationResponse'] =
    ResolversParentTypes['ResendVerificationResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ResetPasswordResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ResetPasswordResponse'] =
    ResolversParentTypes['ResetPasswordResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ResourceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Resource'] = ResolversParentTypes['Resource'],
> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Types.Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResourcePageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ResourcePage'] = ResolversParentTypes['ResourcePage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  resources?: Resolver<Array<ResolversTypes['Resource']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResourceTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ResourceTag'] = ResolversParentTypes['ResourceTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  resource?: Resolver<
    Types.Maybe<ResolversTypes['Resource']>,
    ParentType,
    ContextType,
    RequireFields<Types.ResourceTagResourceArgs, 'scope'>
  >;
  resourceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<
    Types.Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<Types.ResourceTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RevokeMyUserSessionResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RevokeMyUserSessionResult'] =
    ResolversParentTypes['RevokeMyUserSessionResult'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type RoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groupCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  groups?: Resolver<Types.Maybe<Array<ResolversTypes['Group']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  primaryTag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  rolePermissions?: Resolver<
    Types.Maybe<Array<ResolversTypes['RolePermission']>>,
    ParentType,
    ContextType
  >;
  tagCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoleGroup'] = ResolversParentTypes['RoleGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Types.Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<Types.RoleGroupGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<
    Types.Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<Types.RoleGroupRoleArgs, 'scope'>
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

export type RolePermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolePermission'] =
    ResolversParentTypes['RolePermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<
    Types.Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<Types.RolePermissionPermissionArgs, 'scope'>
  >;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<
    Types.Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<Types.RolePermissionRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleTagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoleTag'] = ResolversParentTypes['RoleTag'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  role?: Resolver<
    Types.Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<Types.RoleTagRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<
    Types.Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<Types.RoleTagTagArgs, 'scope'>
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

export type SessionExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SessionExportData'] =
    ResolversParentTypes['SessionExportData'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  ipAddress?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  userAgent?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type SigningKeyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SigningKey'] = ResolversParentTypes['SigningKey'],
> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kid?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  publicKeyPem?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rotatedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SyncProjectResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SyncProjectResult'] =
    ResolversParentTypes['SyncProjectResult'],
> = ResolversObject<{
  groupPermissionsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  groupTagsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  groupsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  importId?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  permissionsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectGroupsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectPermissionsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectResourcesLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectRolesLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectTagsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectUserApiKeysCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  projectUsersEnsured?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  resourcesCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  roleGroupsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  roleTagsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rolesCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tagsCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userRolesAssigned?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userTagsLinked?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  usersCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  warnings?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type TagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag'],
> = ResolversObject<{
  color?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<Types.Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
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

export type UnreadNotificationCountResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UnreadNotificationCount'] =
    ResolversParentTypes['UnreadNotificationCount'],
> = ResolversObject<{
  unreadCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UploadUserPictureResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UploadUserPictureResult'] =
    ResolversParentTypes['UploadUserPictureResult'],
> = ResolversObject<{
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  accounts?: Resolver<Types.Maybe<Array<ResolversTypes['Account']>>, ParentType, ContextType>;
  authenticationMethods?: Resolver<
    Types.Maybe<Array<ResolversTypes['UserAuthenticationMethod']>>,
    ParentType,
    ContextType
  >;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pictureUrl?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  primaryTag?: Resolver<Types.Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  projectUserApiKeyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  roleCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  roles?: Resolver<Types.Maybe<Array<ResolversTypes['Role']>>, ParentType, ContextType>;
  tagCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Types.Maybe<Array<ResolversTypes['Tag']>>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userGroups?: Resolver<Types.Maybe<Array<ResolversTypes['UserGroup']>>, ParentType, ContextType>;
  userPermissions?: Resolver<
    Types.Maybe<Array<ResolversTypes['UserPermission']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserAuthenticationMethodResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserAuthenticationMethod'] =
    ResolversParentTypes['UserAuthenticationMethod'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['UserAuthenticationMethodProvider'], ParentType, ContextType>;
  providerData?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  providerId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserDataExportResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserDataExport'] =
    ResolversParentTypes['UserDataExport'],
> = ResolversObject<{
  accounts?: Resolver<Array<ResolversTypes['AccountExportData']>, ParentType, ContextType>;
  authenticationMethods?: Resolver<
    Array<ResolversTypes['AuthenticationMethodExportData']>,
    ParentType,
    ContextType
  >;
  exportedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  organizationMemberships?: Resolver<
    Array<ResolversTypes['OrganizationMembershipExportData']>,
    ParentType,
    ContextType
  >;
  projectMemberships?: Resolver<
    Array<ResolversTypes['ProjectMembershipExportData']>,
    ParentType,
    ContextType
  >;
  sessions?: Resolver<Array<ResolversTypes['SessionExportData']>, ParentType, ContextType>;
  user?: Resolver<ResolversTypes['UserExportData'], ParentType, ContextType>;
}>;

export type UserExportDataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserExportData'] =
    ResolversParentTypes['UserExportData'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  email?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
}>;

export type UserGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserGroup'] = ResolversParentTypes['UserGroup'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  group?: Resolver<
    Types.Maybe<ResolversTypes['Group']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserGroupGroupArgs, 'scope'>
  >;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Types.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserGroupUserArgs, 'scope'>
  >;
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

export type UserPermissionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserPermission'] =
    ResolversParentTypes['UserPermission'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  permission?: Resolver<
    Types.Maybe<ResolversTypes['Permission']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserPermissionPermissionArgs, 'scope'>
  >;
  permissionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Types.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserPermissionUserArgs, 'scope'>
  >;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserRoleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserRole'] = ResolversParentTypes['UserRole'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<
    Types.Maybe<ResolversTypes['Role']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserRoleRoleArgs, 'scope'>
  >;
  roleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Types.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserRoleUserArgs, 'scope'>
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
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ipAddress?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastUsedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<Types.Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userAgent?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userAuthenticationMethod?: Resolver<
    Types.Maybe<ResolversTypes['UserAuthenticationMethod']>,
    ParentType,
    ContextType
  >;
  userAuthenticationMethodId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSessionPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserSessionPage'] =
    ResolversParentTypes['UserSessionPage'],
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
  deletedAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tag?: Resolver<
    Types.Maybe<ResolversTypes['Tag']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserTagTagArgs, 'scope'>
  >;
  tagId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<
    Types.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<Types.UserTagUserArgs, 'scope'>
  >;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VerifyEmailResponseResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['VerifyEmailResponse'] =
    ResolversParentTypes['VerifyEmailResponse'],
> = ResolversObject<{
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageKey?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type WebhookDeliveryAttemptResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WebhookDeliveryAttempt'] =
    ResolversParentTypes['WebhookDeliveryAttempt'],
> = ResolversObject<{
  attemptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  deliveredAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  errorDetails?: Resolver<Types.Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  eventId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastResponseStatus?: Resolver<Types.Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  nextRetryAt?: Resolver<Types.Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['WebhookDeliveryStatus'], ParentType, ContextType>;
  subscriptionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
}>;

export type WebhookDeliveryPageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WebhookDeliveryPage'] =
    ResolversParentTypes['WebhookDeliveryPage'],
> = ResolversObject<{
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['WebhookDeliveryAttempt']>, ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type WebhookSubscriptionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WebhookSubscription'] =
    ResolversParentTypes['WebhookSubscription'],
> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  createdById?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eventTypes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WebhookSubscriptionWithSecretResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WebhookSubscriptionWithSecret'] =
    ResolversParentTypes['WebhookSubscriptionWithSecret'],
> = ResolversObject<{
  active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  createdById?: Resolver<Types.Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  description?: Resolver<Types.Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  eventTypes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  projectId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  secret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = any> = ResolversObject<{
  AcceptInvitationResult?: AcceptInvitationResultResolvers<ContextType>;
  Account?: AccountResolvers<ContextType>;
  AccountExportData?: AccountExportDataResolvers<ContextType>;
  AccountPage?: AccountPageResolvers<ContextType>;
  AccountProject?: AccountProjectResolvers<ContextType>;
  AccountProjectApiKey?: AccountProjectApiKeyResolvers<ContextType>;
  AccountProjectTag?: AccountProjectTagResolvers<ContextType>;
  AccountRole?: AccountRoleResolvers<ContextType>;
  AccountTag?: AccountTagResolvers<ContextType>;
  ApiKey?: ApiKeyResolvers<ContextType>;
  ApiKeyPage?: ApiKeyPageResolvers<ContextType>;
  Auditable?: AuditableResolvers<ContextType>;
  AuthenticationMethodExportData?: AuthenticationMethodExportDataResolvers<ContextType>;
  AuthorizationResult?: AuthorizationResultResolvers<ContextType>;
  ChangeMyPasswordResult?: ChangeMyPasswordResultResolvers<ContextType>;
  Creatable?: CreatableResolvers<ContextType>;
  CreateAccountResult?: CreateAccountResultResolvers<ContextType>;
  CreateApiKeyResult?: CreateApiKeyResultResolvers<ContextType>;
  CreateMySecondaryAccountResult?: CreateMySecondaryAccountResultResolvers<ContextType>;
  CreateProjectAppResult?: CreateProjectAppResultResolvers<ContextType>;
  Date?: GraphQLScalarType;
  ExchangeApiKeyResult?: ExchangeApiKeyResultResolvers<ContextType>;
  Group?: GroupResolvers<ContextType>;
  GroupPage?: GroupPageResolvers<ContextType>;
  GroupPermission?: GroupPermissionResolvers<ContextType>;
  GroupTag?: GroupTagResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LoginResponse?: LoginResponseResolvers<ContextType>;
  LogoutMyUserResponse?: LogoutMyUserResponseResolvers<ContextType>;
  MarkAllNotificationsReadResult?: MarkAllNotificationsReadResultResolvers<ContextType>;
  MeResponse?: MeResponseResolvers<ContextType>;
  MfaDevice?: MfaDeviceResolvers<ContextType>;
  MfaEnrollment?: MfaEnrollmentResolvers<ContextType>;
  MfaRecoveryCodeStatus?: MfaRecoveryCodeStatusResolvers<ContextType>;
  MfaSetupResponse?: MfaSetupResponseResolvers<ContextType>;
  MfaVerifyResponse?: MfaVerifyResponseResolvers<ContextType>;
  MfaVerifyResult?: MfaVerifyResultResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MyProjectMembership?: MyProjectMembershipResolvers<ContextType>;
  Notification?: NotificationResolvers<ContextType>;
  NotificationEventScope?: NotificationEventScopeResolvers<ContextType>;
  NotificationPage?: NotificationPageResolvers<ContextType>;
  NotificationPreference?: NotificationPreferenceResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationGroup?: OrganizationGroupResolvers<ContextType>;
  OrganizationInvitation?: OrganizationInvitationResolvers<ContextType>;
  OrganizationInvitationPage?: OrganizationInvitationPageResolvers<ContextType>;
  OrganizationMember?: OrganizationMemberResolvers<ContextType>;
  OrganizationMemberPage?: OrganizationMemberPageResolvers<ContextType>;
  OrganizationMembershipExportData?: OrganizationMembershipExportDataResolvers<ContextType>;
  OrganizationPage?: OrganizationPageResolvers<ContextType>;
  OrganizationPermission?: OrganizationPermissionResolvers<ContextType>;
  OrganizationProject?: OrganizationProjectResolvers<ContextType>;
  OrganizationProjectApiKey?: OrganizationProjectApiKeyResolvers<ContextType>;
  OrganizationProjectTag?: OrganizationProjectTagResolvers<ContextType>;
  OrganizationRole?: OrganizationRoleResolvers<ContextType>;
  OrganizationTag?: OrganizationTagResolvers<ContextType>;
  OrganizationUser?: OrganizationUserResolvers<ContextType>;
  PaginatedResults?: PaginatedResultsResolvers<ContextType>;
  Permission?: PermissionResolvers<ContextType>;
  PermissionPage?: PermissionPageResolvers<ContextType>;
  PermissionTag?: PermissionTagResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectApp?: ProjectAppResolvers<ContextType>;
  ProjectAppPage?: ProjectAppPageResolvers<ContextType>;
  ProjectAppTag?: ProjectAppTagResolvers<ContextType>;
  ProjectGroup?: ProjectGroupResolvers<ContextType>;
  ProjectMembershipExportData?: ProjectMembershipExportDataResolvers<ContextType>;
  ProjectPage?: ProjectPageResolvers<ContextType>;
  ProjectPermission?: ProjectPermissionResolvers<ContextType>;
  ProjectResource?: ProjectResourceResolvers<ContextType>;
  ProjectRole?: ProjectRoleResolvers<ContextType>;
  ProjectRolePermission?: ProjectRolePermissionResolvers<ContextType>;
  ProjectSyncJob?: ProjectSyncJobResolvers<ContextType>;
  ProjectSyncJobPage?: ProjectSyncJobPageResolvers<ContextType>;
  ProjectTag?: ProjectTagResolvers<ContextType>;
  ProjectUser?: ProjectUserResolvers<ContextType>;
  ProjectUserApiKey?: ProjectUserApiKeyResolvers<ContextType>;
  ProjectUserGroup?: ProjectUserGroupResolvers<ContextType>;
  ProjectUserPermission?: ProjectUserPermissionResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RefreshSessionResponse?: RefreshSessionResponseResolvers<ContextType>;
  RequestPasswordResetResponse?: RequestPasswordResetResponseResolvers<ContextType>;
  ResendVerificationResponse?: ResendVerificationResponseResolvers<ContextType>;
  ResetPasswordResponse?: ResetPasswordResponseResolvers<ContextType>;
  Resource?: ResourceResolvers<ContextType>;
  ResourcePage?: ResourcePageResolvers<ContextType>;
  ResourceTag?: ResourceTagResolvers<ContextType>;
  RevokeMyUserSessionResult?: RevokeMyUserSessionResultResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleGroup?: RoleGroupResolvers<ContextType>;
  RolePage?: RolePageResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  RoleTag?: RoleTagResolvers<ContextType>;
  Searchable?: SearchableResolvers<ContextType>;
  SessionExportData?: SessionExportDataResolvers<ContextType>;
  SigningKey?: SigningKeyResolvers<ContextType>;
  SyncProjectResult?: SyncProjectResultResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagPage?: TagPageResolvers<ContextType>;
  UnreadNotificationCount?: UnreadNotificationCountResolvers<ContextType>;
  UploadUserPictureResult?: UploadUserPictureResultResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserAuthenticationMethod?: UserAuthenticationMethodResolvers<ContextType>;
  UserDataExport?: UserDataExportResolvers<ContextType>;
  UserExportData?: UserExportDataResolvers<ContextType>;
  UserGroup?: UserGroupResolvers<ContextType>;
  UserPage?: UserPageResolvers<ContextType>;
  UserPermission?: UserPermissionResolvers<ContextType>;
  UserRole?: UserRoleResolvers<ContextType>;
  UserSession?: UserSessionResolvers<ContextType>;
  UserSessionPage?: UserSessionPageResolvers<ContextType>;
  UserTag?: UserTagResolvers<ContextType>;
  VerifyEmailResponse?: VerifyEmailResponseResolvers<ContextType>;
  WebhookDeliveryAttempt?: WebhookDeliveryAttemptResolvers<ContextType>;
  WebhookDeliveryPage?: WebhookDeliveryPageResolvers<ContextType>;
  WebhookSubscription?: WebhookSubscriptionResolvers<ContextType>;
  WebhookSubscriptionWithSecret?: WebhookSubscriptionWithSecretResolvers<ContextType>;
}>;
