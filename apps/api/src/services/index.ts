import { Grant, GrantAuth } from '@grantjs/core';
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
  projectTagAuditLogs,
  projectUserApiKeyAuditLogs,
  projectUserAuditLogs,
  resourceAuditLogs,
  resourceTagAuditLogs,
  roleAuditLogs,
  roleGroupsAuditLogs,
  roleTagAuditLogs,
  signingKeyAuditLogs,
  tagAuditLogs,
  userAuditLogs,
  userAuthenticationMethodsAuditLogs,
  userMfaFactorAuditLogs,
  userRolesAuditLogs,
  userSessionAuditLogs,
  userTagsAuditLogs,
} from '@grantjs/database';

import { DrizzleAuditLogger } from '@/lib/audit';
import { IEntityCacheAdapter } from '@/lib/cache';
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
import { FileStorageService } from './file-storage.service';
import { GitHubOAuthService } from './github-oauth.service';
import { GroupPermissionService } from './group-permissions.service';
import { GroupTagService } from './group-tags.service';
import { GroupService } from './groups.service';
import { MeService } from './me.service';
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
import { ProjectGroupService } from './project-groups.service';
import { ProjectPermissionSyncService } from './project-permission-sync.service';
import { ProjectPermissionService } from './project-permissions.service';
import { ProjectResourceService } from './project-resources.service';
import { ProjectRoleService } from './project-roles.service';
import { ProjectTagService } from './project-tags.service';
import { ProjectUserApiKeyService } from './project-user-api-keys.service';
import { ProjectUserService } from './project-users.service';
import { ProjectService } from './projects.service';
import { ResourceTagService } from './resource-tags.service';
import { ResourceService } from './resources.service';
import { RoleGroupService } from './role-groups.service';
import { RoleTagService } from './role-tags.service';
import { RoleService } from './roles.service';
import { SigningKeyService } from './signing-keys.service';
import { TagService } from './tags.service';
import { UserAuthenticationMethodService } from './user-authentication-methods.service';
import { UserMfaService } from './user-mfa.service';
import { UserRoleService } from './user-roles.service';
import { UserSessionService } from './user-sessions.service';
import { UserTagService } from './user-tags.service';
import { UserService } from './users.service';

export type Services = ReturnType<typeof createServices>;

/** Helper to create a DrizzleAuditLogger for a specific entity audit table */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle audit tables have heterogeneous PgTableWithColumns<T> types; a union of all 40+ is impractical
function audit(table: any, entityIdField: string, user: GrantAuth | null, db: DbSchema) {
  return new DrizzleAuditLogger(table, entityIdField, user, db);
}

export function createServices(
  repositories: Repositories,
  user: GrantAuth | null,
  db: DbSchema,
  cache: IEntityCacheAdapter,
  grant: Grant
) {
  const servicesBase = {
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
    fileStorage: new FileStorageService(),
    githubOAuth: new GitHubOAuthService(),
    oauthState: new OAuthStateService(cache.oauth),
    users: new UserService(
      repositories.userRepository,
      user,
      audit(userAuditLogs, 'userId', user, db)
    ),
    userAuthenticationMethods: new UserAuthenticationMethodService(
      repositories.userAuthenticationMethodRepository,
      repositories.userSessionRepository,
      audit(userAuthenticationMethodsAuditLogs, 'userAuthenticationMethodId', user, db)
    ),
    userMfa: new UserMfaService(
      repositories.userMfaFactorRepository,
      repositories.userMfaRecoveryCodeRepository,
      audit(userMfaFactorAuditLogs, 'userMfaFactorId', user, db)
    ),
    userSessions: new UserSessionService(
      repositories.userSessionRepository,
      audit(userSessionAuditLogs, 'userSessionId', user, db),
      grant
    ),
    roles: new RoleService(repositories.roleRepository, audit(roleAuditLogs, 'roleId', user, db)),
    userRoles: new UserRoleService(
      repositories.userRepository,
      repositories.roleRepository,
      repositories.userRoleRepository,
      audit(userRolesAuditLogs, 'userRoleId', user, db)
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
      audit(groupAuditLogs, 'groupId', user, db)
    ),
    permissions: new PermissionService(
      repositories.permissionRepository,
      audit(permissionAuditLogs, 'permissionId', user, db)
    ),
    resources: new ResourceService(
      repositories.resourceRepository,
      audit(resourceAuditLogs, 'resourceId', user, db)
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
      audit(signingKeyAuditLogs, 'signingKeyId', user, db)
    ),
    apiKeys: new ApiKeyService(
      repositories.accountProjectRepository,
      repositories.organizationProjectRepository,
      repositories.projectUserApiKeyRepository,
      repositories.accountProjectApiKeyRepository,
      repositories.organizationProjectApiKeyRepository,
      repositories.apiKeyRepository,
      user,
      audit(apiKeyAuditLogs, 'apiKeyId', user, db),
      grant
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
      audit(projectUserAuditLogs, 'projectUserId', user, db)
    ),
    organizations: new OrganizationService(
      repositories.organizationRepository,
      repositories.organizationUserRepository,
      user,
      audit(organizationAuditLogs, 'organizationId', user, db)
    ),
    organizationInvitations: new OrganizationInvitationService(
      repositories.organizationMemberRepository,
      repositories.roleRepository,
      repositories.organizationInvitationRepository,
      repositories.organizationUserRepository,
      user,
      audit(organizationInvitationsAuditLogs, 'organizationInvitationId', user, db)
    ),
    organizationMembers: new OrganizationMemberService(
      repositories.organizationMemberRepository,
      repositories.organizationUserRepository,
      repositories.organizationRoleRepository,
      repositories.roleRepository,
      user,
      audit(organizationAuditLogs, 'organizationId', user, db)
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
      audit(groupPermissionsAuditLogs, 'groupPermissionId', user, db)
    ),
    organizationUsers: new OrganizationUserService(
      repositories.organizationRepository,
      repositories.userRepository,
      repositories.organizationUserRepository,
      repositories.organizationRoleRepository,
      audit(organizationUsersAuditLogs, 'organizationUserId', user, db)
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
      audit(roleGroupsAuditLogs, 'roleGroupId', user, db)
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
    projectPermissionSync: new ProjectPermissionSyncService(
      repositories.projectPermissionSyncRepository,
      servicesBase.roles,
      servicesBase.groups,
      servicesBase.roleGroups,
      servicesBase.groupPermissions,
      servicesBase.projectRoles,
      servicesBase.projectGroups,
      servicesBase.projectPermissions,
      servicesBase.projectResources,
      servicesBase.projectUsers,
      servicesBase.userRoles
    ),
  };
}
