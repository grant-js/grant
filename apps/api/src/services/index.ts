import { Grant, GrantAuth, type ISecretResolver } from '@grantjs/core';
import {
  accountAuditLogs,
  accountProjectApiKeyAuditLogs,
  accountProjectsAuditLogs,
  accountProjectTagAuditLogs,
  accountRoleAuditLogs,
  accountTagAuditLogs,
  apiKeyAuditLogs,
  DbSchema,
  groupAuditLogs,
  groupPermissionsAuditLogs,
  groupTagsAuditLogs,
  organizationAuditLogs,
  organizationGroupsAuditLogs,
  organizationInvitationsAuditLogs,
  organizationPermissionsAuditLogs,
  organizationProjectApiKeyAuditLogs,
  organizationProjectsAuditLogs,
  organizationProjectTagAuditLogs,
  organizationRolesAuditLogs,
  organizationTagAuditLogs,
  organizationUsersAuditLogs,
  permissionAuditLogs,
  permissionTagAuditLogs,
  projectAppAuditLogs,
  projectAppTagAuditLogs,
  projectAuditLogs,
  projectGroupAuditLogs,
  projectPermissionsAuditLogs,
  projectResourceAuditLogs,
  projectRoleAuditLogs,
  projectRolePermissionAuditLogs,
  projectSyncJobAuditLogs,
  projectTagAuditLogs,
  projectUserApiKeyAuditLogs,
  projectUserAuditLogs,
  projectUserGroupAuditLogs,
  projectUserPermissionAuditLogs,
  resourceAuditLogs,
  resourceTagAuditLogs,
  roleAuditLogs,
  roleGroupsAuditLogs,
  rolePermissionsAuditLogs,
  roleTagAuditLogs,
  signingKeyAuditLogs,
  tagAuditLogs,
  userAuditLogs,
  userAuthenticationMethodsAuditLogs,
  userGroupsAuditLogs,
  userMfaFactorAuditLogs,
  userPermissionsAuditLogs,
  userRolesAuditLogs,
  userSessionAuditLogs,
  userTagsAuditLogs,
} from '@grantjs/database';

import { DrizzleAuditLogger } from '@/lib/audit';
import { IEntityCacheAdapter } from '@/lib/cache';
import { DrizzleEventPublisher, type ScheduleAfterCommit } from '@/lib/events';
import {
  AudienceResolver,
  NotificationDisplayContextResolver,
  NotificationGeneratorConsumer,
} from '@/lib/notifications';
import { secretResolver } from '@/lib/secrets';
import { webhookAdapters, WebhookDispatcherConsumer } from '@/lib/webhooks';
import { Repositories } from '@/repositories';

import { AccountProjectApiKeyService } from './account-project-api-keys.service';
import { AccountProjectTagService } from './account-project-tags.service';
import { AccountProjectService } from './account-projects.service';
import { AccountRoleService } from './account-roles.service';
import { AccountTagsService } from './account-tags.service';
import { AccountService } from './accounts.service';
import { ApiKeyService } from './api-keys.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { EventRelayService } from './event-relay.service';
import { FileStorageService } from './file-storage.service';
import { GitHubOAuthService } from './github-oauth.service';
import { GroupPermissionService } from './group-permissions.service';
import { GroupTagService } from './group-tags.service';
import { GroupService } from './groups.service';
import { MeService } from './me.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationService } from './notifications.service';
import { OAuthStateService } from './oauth-state.service';
import { OrganizationGroupService } from './organization-groups.service';
import { OrganizationInvitationService } from './organization-invitations.service';
import { OrganizationMemberService } from './organization-members.service';
import { OrganizationPermissionService } from './organization-permissions.service';
import { OrganizationProjectApiKeyService } from './organization-project-api-keys.service';
import { OrganizationProjectTagService } from './organization-project-tags.service';
import { OrganizationProjectService } from './organization-projects.service';
import { OrganizationRoleService } from './organization-roles.service';
import { OrganizationTagService } from './organization-tags.service';
import { OrganizationUserService } from './organization-users.service';
import { OrganizationService } from './organizations.service';
import { PermissionTagService } from './permission-tags.service';
import { PermissionService } from './permissions.service';
import { ProjectAppTagService } from './project-app-tags.service';
import { ProjectAppService } from './project-apps.service';
import { ProjectExportService } from './project-export.service';
import { ProjectGroupService } from './project-groups.service';
import { ProjectImportService } from './project-import.service';
import { ProjectPermissionService } from './project-permissions.service';
import { ProjectResourceService } from './project-resources.service';
import { ProjectRolePermissionService } from './project-role-permissions.service';
import { ProjectRoleService } from './project-roles.service';
import { ProjectSyncJobService } from './project-sync-job.service';
import { ProjectTagService } from './project-tags.service';
import { ProjectUserApiKeyService } from './project-user-api-keys.service';
import { ProjectUserGroupService } from './project-user-groups.service';
import { ProjectUserPermissionService } from './project-user-permissions.service';
import { ProjectUserService } from './project-users.service';
import { ProjectService } from './projects.service';
import { ResourceTagService } from './resource-tags.service';
import { ResourceService } from './resources.service';
import { RoleGroupService } from './role-groups.service';
import { RolePermissionService } from './role-permissions.service';
import { RoleTagService } from './role-tags.service';
import { RoleService } from './roles.service';
import { SigningKeyService } from './signing-keys.service';
import { TagService } from './tags.service';
import { UserAuthenticationMethodService } from './user-authentication-methods.service';
import { UserGroupService } from './user-groups.service';
import { UserMfaService } from './user-mfa.service';
import { UserPermissionService } from './user-permissions.service';
import { UserRoleService } from './user-roles.service';
import { UserSessionService } from './user-sessions.service';
import { UserTagService } from './user-tags.service';
import { UserService } from './users.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookSubscriptionService } from './webhook-subscriptions.service';

export type Services = ReturnType<typeof createServices>;

/** Helper to create a DrizzleAuditLogger for a specific entity audit table */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle audit tables have heterogeneous PgTableWithColumns<T> types; a union of all 40+ is impractical
function audit(table: any, entityIdField: string, user: GrantAuth | null, db: DbSchema) {
  return new DrizzleAuditLogger(table, entityIdField, user, db);
}

export interface CreateServicesOptions {
  scheduleAfterCommit?: ScheduleAfterCommit;
  /**
   * Overrides the process-wide resolver from `@/lib/secrets`. Present so tests can
   * inject a fake; production callers leave it unset.
   */
  secrets?: ISecretResolver;
}

export function createServices(
  repositories: Repositories,
  user: GrantAuth | null,
  db: DbSchema,
  cache: IEntityCacheAdapter,
  grant: Grant,
  options?: CreateServicesOptions
) {
  const secrets = options?.secrets ?? secretResolver;
  const events = new DrizzleEventPublisher(user, db, {
    scheduleAfterCommit: options?.scheduleAfterCommit,
  });
  const webhookDispatcher = new WebhookDispatcherConsumer(
    repositories.webhookSubscriptionRepository,
    repositories.webhookDeliveryRepository
  );
  const notificationGenerator = new NotificationGeneratorConsumer(
    new AudienceResolver(
      repositories.projectUserRepository,
      repositories.organizationUserRepository,
      repositories.organizationProjectRepository,
      repositories.accountProjectRepository,
      repositories.accountRepository
    ),
    repositories.notificationPreferenceRepository,
    repositories.notificationRepository,
    new NotificationDisplayContextResolver(
      repositories.userRepository,
      repositories.organizationRepository,
      repositories.accountRepository,
      repositories.projectRepository,
      repositories.roleRepository
    ),
    repositories.organizationUserRepository,
    repositories.projectUserRepository
  );
  const servicesBase = {
    events,
    me: new MeService(repositories.userRepository, repositories.accountRepository, grant),
    accounts: new AccountService(
      repositories.accountRepository,
      user,
      audit(accountAuditLogs, 'accountId', user, db)
    ),
    accountProjectApiKeys: new AccountProjectApiKeyService(
      repositories.accountProjectRepository,
      repositories.accountRoleRepository,
      repositories.accountProjectApiKeyRepository,
      repositories.userRoleRepository,
      user,
      audit(accountProjectApiKeyAuditLogs, 'accountProjectApiKeyId', user, db)
    ),
    accountProjects: new AccountProjectService(
      repositories.accountRepository,
      repositories.projectRepository,
      repositories.accountProjectRepository,
      audit(accountProjectsAuditLogs, 'accountProjectId', user, db)
    ),
    accountProjectTags: new AccountProjectTagService(
      repositories.accountRepository,
      repositories.projectRepository,
      repositories.tagRepository,
      repositories.accountProjectTagRepository,
      audit(accountProjectTagAuditLogs, 'accountProjectTagId', user, db)
    ),
    accountRoles: new AccountRoleService(
      repositories.accountRepository,
      repositories.roleRepository,
      repositories.accountRoleRepository,
      audit(accountRoleAuditLogs, 'accountRoleId', user, db)
    ),
    accountTags: new AccountTagsService(
      repositories.accountRepository,
      repositories.tagRepository,
      repositories.accountTagsRepository,
      audit(accountTagAuditLogs, 'accountTagId', user, db)
    ),
    auth: new AuthService(grant),
    email: new EmailService(),
    eventRelay: new EventRelayService(repositories.eventLogRepository, [
      webhookDispatcher,
      notificationGenerator,
    ]),
    notifications: new NotificationService(
      repositories.notificationRepository,
      repositories.notificationPreferenceRepository
    ),
    notificationDelivery: new NotificationDeliveryService(
      repositories.notificationRepository,
      repositories.userAuthenticationMethodRepository,
      new EmailService(),
      db
    ),
    webhookSubscriptions: new WebhookSubscriptionService(
      repositories.webhookSubscriptionRepository,
      repositories.webhookDeliveryRepository,
      webhookAdapters.delivery,
      user?.userId ?? null
    ),
    webhookDelivery: new WebhookDeliveryService(
      repositories.webhookDeliveryRepository,
      repositories.webhookSubscriptionRepository,
      repositories.eventLogRepository,
      webhookAdapters.signer,
      webhookAdapters.delivery,
      db
    ),
    fileStorage: new FileStorageService(),
    githubOAuth: new GitHubOAuthService(secrets),
    oauthState: new OAuthStateService(cache.oauth),
    users: new UserService(
      repositories.userRepository,
      user,
      audit(userAuditLogs, 'userId', user, db)
    ),
    userAuthenticationMethods: new UserAuthenticationMethodService(
      repositories.userAuthenticationMethodRepository,
      repositories.userSessionRepository,
      audit(userAuthenticationMethodsAuditLogs, 'userAuthenticationMethodId', user, db),
      events
    ),
    userMfa: new UserMfaService(
      repositories.userMfaFactorRepository,
      repositories.userMfaRecoveryCodeRepository,
      audit(userMfaFactorAuditLogs, 'userMfaFactorId', user, db),
      events,
      secrets
    ),
    userSessions: new UserSessionService(
      repositories.userSessionRepository,
      audit(userSessionAuditLogs, 'userSessionId', user, db),
      grant,
      events
    ),
    roles: new RoleService(
      repositories.roleRepository,
      audit(roleAuditLogs, 'roleId', user, db),
      events
    ),
    userRoles: new UserRoleService(
      repositories.userRepository,
      repositories.roleRepository,
      repositories.userRoleRepository,
      audit(userRolesAuditLogs, 'userRoleId', user, db),
      events
    ),
    userPermissions: new UserPermissionService(
      repositories.userRepository,
      repositories.permissionRepository,
      repositories.userPermissionRepository,
      audit(userPermissionsAuditLogs, 'userPermissionId', user, db),
      events
    ),
    userGroups: new UserGroupService(
      repositories.userRepository,
      repositories.groupRepository,
      repositories.userGroupRepository,
      audit(userGroupsAuditLogs, 'userGroupId', user, db),
      events
    ),
    userTags: new UserTagService(
      repositories.userRepository,
      repositories.tagRepository,
      repositories.userTagRepository,
      audit(userTagsAuditLogs, 'userTagId', user, db)
    ),
    tags: new TagService(repositories.tagRepository, audit(tagAuditLogs, 'tagId', user, db)),
    groups: new GroupService(
      repositories.groupRepository,
      audit(groupAuditLogs, 'groupId', user, db),
      events
    ),
    permissions: new PermissionService(
      repositories.permissionRepository,
      audit(permissionAuditLogs, 'permissionId', user, db),
      events
    ),
    resources: new ResourceService(
      repositories.resourceRepository,
      audit(resourceAuditLogs, 'resourceId', user, db),
      events
    ),
    resourceTags: new ResourceTagService(
      repositories.resourceRepository,
      repositories.tagRepository,
      repositories.resourceTagRepository,
      audit(resourceTagAuditLogs, 'resourceTagId', user, db)
    ),
    projects: new ProjectService(
      repositories.projectRepository,
      audit(projectAuditLogs, 'projectId', user, db)
    ),
    projectApps: new ProjectAppService(
      repositories.projectAppRepository,
      audit(projectAppAuditLogs, 'projectAppId', user, db)
    ),
    projectAppTags: new ProjectAppTagService(
      repositories.projectAppRepository,
      repositories.tagRepository,
      repositories.projectAppTagRepository,
      audit(projectAppTagAuditLogs, 'projectAppTagId', user, db)
    ),
    projectGroups: new ProjectGroupService(
      repositories.projectRepository,
      repositories.groupRepository,
      repositories.projectGroupRepository,
      audit(projectGroupAuditLogs, 'projectGroupId', user, db)
    ),
    projectRoles: new ProjectRoleService(
      repositories.projectRepository,
      repositories.roleRepository,
      repositories.projectRoleRepository,
      audit(projectRoleAuditLogs, 'projectRoleId', user, db)
    ),
    projectRolePermissions: new ProjectRolePermissionService(
      repositories.projectRepository,
      repositories.roleRepository,
      repositories.permissionRepository,
      repositories.projectRolePermissionRepository,
      audit(projectRolePermissionAuditLogs, 'projectRolePermissionId', user, db)
    ),
    projectPermissions: new ProjectPermissionService(
      repositories.projectRepository,
      repositories.permissionRepository,
      repositories.projectPermissionRepository,
      audit(projectPermissionsAuditLogs, 'projectPermissionId', user, db)
    ),
    projectResources: new ProjectResourceService(
      repositories.projectRepository,
      repositories.resourceRepository,
      repositories.projectResourceRepository,
      audit(projectResourceAuditLogs, 'projectResourceId', user, db)
    ),
    projectTags: new ProjectTagService(
      repositories.projectRepository,
      repositories.tagRepository,
      repositories.projectTagRepository,
      audit(projectTagAuditLogs, 'projectTagId', user, db)
    ),
    signingKeys: new SigningKeyService(
      repositories.signingKeyRepository,
      audit(signingKeyAuditLogs, 'signingKeyId', user, db),
      events
    ),
    apiKeys: new ApiKeyService(
      repositories.accountProjectRepository,
      repositories.organizationProjectRepository,
      repositories.apiKeyRepository,
      user,
      audit(apiKeyAuditLogs, 'apiKeyId', user, db),
      grant,
      events
    ),
    projectUserApiKeys: new ProjectUserApiKeyService(
      repositories.projectRepository,
      repositories.userRepository,
      repositories.projectUserApiKeyRepository,
      audit(projectUserApiKeyAuditLogs, 'projectUserApiKeyId', user, db)
    ),
    projectUsers: new ProjectUserService(
      repositories.projectRepository,
      repositories.userRepository,
      repositories.projectUserRepository,
      repositories.organizationProjectRepository,
      repositories.accountProjectRepository,
      audit(projectUserAuditLogs, 'projectUserId', user, db),
      events,
      repositories.userAuthenticationMethodRepository
    ),
    projectUserPermissions: new ProjectUserPermissionService(
      repositories.projectRepository,
      repositories.userRepository,
      repositories.permissionRepository,
      repositories.projectUserPermissionRepository,
      audit(projectUserPermissionAuditLogs, 'projectUserPermissionId', user, db)
    ),
    projectUserGroups: new ProjectUserGroupService(
      repositories.projectRepository,
      repositories.userRepository,
      repositories.groupRepository,
      repositories.projectUserGroupRepository,
      audit(projectUserGroupAuditLogs, 'projectUserGroupId', user, db)
    ),
    organizations: new OrganizationService(
      repositories.organizationRepository,
      repositories.organizationUserRepository,
      user,
      audit(organizationAuditLogs, 'organizationId', user, db),
      events
    ),
    organizationInvitations: new OrganizationInvitationService(
      repositories.organizationMemberRepository,
      repositories.roleRepository,
      repositories.organizationInvitationRepository,
      repositories.organizationUserRepository,
      user,
      audit(organizationInvitationsAuditLogs, 'organizationInvitationId', user, db),
      events,
      repositories.userAuthenticationMethodRepository
    ),
    organizationMembers: new OrganizationMemberService(
      repositories.organizationMemberRepository,
      repositories.organizationUserRepository,
      repositories.organizationRoleRepository,
      repositories.roleRepository,
      user,
      audit(organizationAuditLogs, 'organizationId', user, db),
      events
    ),
    organizationRoles: new OrganizationRoleService(
      repositories.organizationRepository,
      repositories.roleRepository,
      repositories.organizationRoleRepository,
      audit(organizationRolesAuditLogs, 'organizationRoleId', user, db)
    ),
    organizationTags: new OrganizationTagService(
      repositories.organizationRepository,
      repositories.tagRepository,
      repositories.organizationTagRepository,
      audit(organizationTagAuditLogs, 'organizationTagId', user, db)
    ),
    roleTags: new RoleTagService(
      repositories.roleRepository,
      repositories.tagRepository,
      repositories.roleTagRepository,
      audit(roleTagAuditLogs, 'roleTagId', user, db)
    ),
    permissionTags: new PermissionTagService(
      repositories.permissionRepository,
      repositories.tagRepository,
      repositories.permissionTagRepository,
      audit(permissionTagAuditLogs, 'permissionTagId', user, db)
    ),
    groupPermissions: new GroupPermissionService(
      repositories.groupRepository,
      repositories.permissionRepository,
      repositories.groupPermissionRepository,
      audit(groupPermissionsAuditLogs, 'groupPermissionId', user, db),
      events
    ),
    organizationUsers: new OrganizationUserService(
      repositories.organizationRepository,
      repositories.userRepository,
      repositories.organizationUserRepository,
      repositories.organizationRoleRepository,
      audit(organizationUsersAuditLogs, 'organizationUserId', user, db),
      events
    ),
    organizationProjects: new OrganizationProjectService(
      repositories.organizationRepository,
      repositories.projectRepository,
      repositories.organizationProjectRepository,
      audit(organizationProjectsAuditLogs, 'organizationProjectId', user, db)
    ),
    organizationProjectTags: new OrganizationProjectTagService(
      repositories.organizationRepository,
      repositories.projectRepository,
      repositories.tagRepository,
      repositories.organizationProjectTagRepository,
      audit(organizationProjectTagAuditLogs, 'organizationProjectTagId', user, db)
    ),
    roleGroups: new RoleGroupService(
      repositories.roleRepository,
      repositories.groupRepository,
      repositories.roleGroupRepository,
      audit(roleGroupsAuditLogs, 'roleGroupId', user, db),
      events
    ),
    rolePermissions: new RolePermissionService(
      repositories.roleRepository,
      repositories.permissionRepository,
      repositories.rolePermissionRepository,
      audit(rolePermissionsAuditLogs, 'rolePermissionId', user, db),
      events
    ),
    organizationPermissions: new OrganizationPermissionService(
      repositories.organizationRepository,
      repositories.permissionRepository,
      repositories.organizationPermissionRepository,
      audit(organizationPermissionsAuditLogs, 'organizationPermissionId', user, db)
    ),
    organizationProjectApiKeys: new OrganizationProjectApiKeyService(
      repositories.organizationMemberRepository,
      repositories.organizationProjectRepository,
      repositories.organizationRoleRepository,
      repositories.organizationProjectApiKeyRepository,
      repositories.roleRepository,
      user,
      audit(organizationProjectApiKeyAuditLogs, 'organizationProjectApiKeyId', user, db)
    ),
    organizationGroups: new OrganizationGroupService(
      repositories.organizationRepository,
      repositories.groupRepository,
      repositories.organizationGroupRepository,
      audit(organizationGroupsAuditLogs, 'organizationGroupId', user, db)
    ),
    groupTags: new GroupTagService(
      repositories.groupRepository,
      repositories.tagRepository,
      repositories.groupTagRepository,
      audit(groupTagsAuditLogs, 'groupTagId', user, db)
    ),
  };

  return {
    ...servicesBase,
    projectImport: new ProjectImportService(
      repositories.projectImportRepository,
      servicesBase.roles,
      servicesBase.groups,
      servicesBase.roleGroups,
      servicesBase.rolePermissions,
      servicesBase.groupPermissions,
      servicesBase.userPermissions,
      servicesBase.userGroups,
      servicesBase.projectRoles,
      servicesBase.projectGroups,
      servicesBase.projectPermissions,
      servicesBase.projectRolePermissions,
      servicesBase.projectUserPermissions,
      servicesBase.projectUserGroups,
      servicesBase.projectResources,
      servicesBase.projectUsers,
      servicesBase.userRoles,
      servicesBase.apiKeys,
      servicesBase.projectUserApiKeys,
      cache,
      servicesBase.tags,
      servicesBase.projectTags,
      servicesBase.roleTags,
      servicesBase.groupTags,
      servicesBase.userTags,
      servicesBase.resources,
      servicesBase.permissions,
      servicesBase.users,
      servicesBase.userAuthenticationMethods,
      repositories.userRepository,
      servicesBase.resourceTags,
      servicesBase.permissionTags,
      repositories.projectExportRepository
    ),
    projectExport: new ProjectExportService(
      repositories.projectImportRepository,
      repositories.projectExportRepository,
      servicesBase.roles,
      servicesBase.groups,
      servicesBase.roleGroups,
      servicesBase.rolePermissions,
      servicesBase.groupPermissions,
      servicesBase.userPermissions,
      servicesBase.userGroups,
      servicesBase.projectRoles,
      servicesBase.projectGroups,
      servicesBase.projectPermissions,
      servicesBase.projectRolePermissions,
      servicesBase.projectUserPermissions,
      servicesBase.projectUserGroups,
      servicesBase.projectResources,
      servicesBase.projectUsers,
      servicesBase.userRoles,
      servicesBase.apiKeys,
      servicesBase.projectUserApiKeys,
      servicesBase.tags,
      servicesBase.projectTags,
      servicesBase.roleTags,
      servicesBase.groupTags,
      servicesBase.userTags,
      servicesBase.resources,
      servicesBase.permissions,
      servicesBase.users,
      servicesBase.userAuthenticationMethods,
      repositories.userRepository
    ),
    projectSyncJobs: new ProjectSyncJobService(
      repositories.projectSyncJobRepository,
      audit(projectSyncJobAuditLogs, 'projectSyncJobId', user, db),
      events
    ),
  };
}
