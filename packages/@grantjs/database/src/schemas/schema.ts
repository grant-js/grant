import {
  accountProjectApiKeyAuditLogs,
  accountProjectApiKeyAuditLogsRelations,
  accountProjectApiKeys,
  accountProjectApiKeysRelations,
} from './account-project-api-keys.schema';
import { accountProjectTags, accountProjectTagsRelations } from './account-project-tags.schema';
import { accountProjects, accountProjectsRelations } from './account-projects.schema';
import {
  accountRoleAuditLogs,
  accountRoleAuditLogsRelations,
  accountRoles,
  accountRolesRelations,
} from './account-roles.schema';
import { accountTags, accountTagsRelations } from './account-tags.schema';
import { accounts, accountsRelations } from './accounts.schema';
import {
  apiKeyAuditLogs,
  apiKeyAuditLogsRelations,
  apiKeys,
  apiKeysRelations,
} from './api-keys.schema';
import { groupPermissions, groupPermissionsRelations } from './group-permissions.schema';
import { groupTags, groupTagsRelations } from './group-tags.schema';
import { groups, groupsRelations } from './groups.schema';
import { organizationGroups, organizationGroupsRelations } from './organization-groups.schema';
import {
  organizationInvitations,
  organizationInvitationsRelations,
} from './organization-invitations.schema';
import {
  organizationPermissions,
  organizationPermissionsRelations,
} from './organization-permissions.schema';
import {
  organizationProjectApiKeyAuditLogs,
  organizationProjectApiKeyAuditLogsRelations,
  organizationProjectApiKeys,
  organizationProjectApiKeysRelations,
} from './organization-project-api-keys.schema';
import {
  organizationProjectTags,
  organizationProjectTagsRelations,
} from './organization-project-tags.schema';
import {
  organizationProjects,
  organizationProjectsRelations,
} from './organization-projects.schema';
import { organizationRoles, organizationRolesRelations } from './organization-roles.schema';
import { organizationTags, organizationTagsRelations } from './organization-tags.schema';
import { organizationUsers, organizationUsersRelations } from './organization-users.schema';
import { organizations, organizationsRelations } from './organizations.schema';
import { permissionTags, permissionTagsRelations } from './permission-tags.schema';
import { permissions, permissionsRelations } from './permissions.schema';
import {
  projectAppTagAuditLogs,
  projectAppTags,
  projectAppTagsRelations,
} from './project-app-tags.schema';
import {
  projectAppAuditLogs,
  projectAppAuditLogsRelations,
  projectApps,
  projectAppsRelations,
} from './project-apps.schema';
import { projectGroups, projectGroupsRelations } from './project-groups.schema';
import { projectPermissions, projectPermissionsRelations } from './project-permissions.schema';
import {
  projectResourceAuditLogs,
  projectResourceAuditLogsRelations,
  projectResources,
  projectResourcesRelations,
} from './project-resources.schema';
import {
  projectRolePermissionAuditLogs,
  projectRolePermissions,
  projectRolePermissionsRelations,
} from './project-role-permissions.schema';
import { projectRoles, projectRolesRelations } from './project-roles.schema';
import {
  projectSyncJobAuditLogs,
  projectSyncJobAuditLogsRelations,
  projectSyncJobs,
  projectSyncJobsRelations,
} from './project-sync-jobs.schema';
import { projectTags, projectTagsRelations } from './project-tags.schema';
import {
  projectUserApiKeyAuditLogs,
  projectUserApiKeyAuditLogsRelations,
  projectUserApiKeys,
  projectUserApiKeysRelations,
} from './project-user-api-keys.schema';
import {
  projectUserGroupAuditLogs,
  projectUserGroups,
  projectUserGroupsRelations,
} from './project-user-groups.schema';
import {
  projectUserPermissionAuditLogs,
  projectUserPermissions,
  projectUserPermissionsRelations,
} from './project-user-permissions.schema';
import { projectUsers, projectUsersRelations } from './project-users.schema';
import { projects, projectsRelations } from './projects.schema';
import { resourceTagAuditLogs, resourceTags, resourceTagsRelations } from './resource-tags.schema';
import { resourcesRelations } from './resources.relations';
import { resourceAuditLogs, resourceAuditLogsRelations, resources } from './resources.schema';
import { roleGroups, roleGroupsRelations } from './role-groups.schema';
import {
  rolePermissions,
  rolePermissionsAuditLogs,
  rolePermissionsRelations,
} from './role-permissions.schema';
import { roleTags, roleTagsRelations } from './role-tags.schema';
import { roles, rolesRelations } from './roles.schema';
import {
  signingKeyAuditLogs,
  signingKeyAuditLogsRelations,
  signingKeys,
} from './signing-keys.schema';
import { tags } from './tags.schema';
import {
  userAuthenticationMethods,
  userAuthenticationMethodsRelations,
} from './user-authentication-methods.schema';
import { userGroups, userGroupsAuditLogs, userGroupsRelations } from './user-groups.schema';
import {
  userMfaFactorAuditLogs,
  userMfaFactors,
  userMfaFactorsRelations,
} from './user-mfa-factors.schema';
import {
  userMfaRecoveryCodes,
  userMfaRecoveryCodesRelations,
} from './user-mfa-recovery-codes.schema';
import {
  userPermissions,
  userPermissionsAuditLogs,
  userPermissionsRelations,
} from './user-permissions.schema';
import { userRoles, userRolesRelations } from './user-roles.schema';
import { userSessions, userSessionsRelations } from './user-sessions.schema';
import { userTags, userTagsRelations } from './user-tags.schema';
import { users, usersRelations } from './users.schema';

// New authentication entities

export const schema = {
  accountProjectApiKeyAuditLogs,
  accountProjectApiKeys,
  accountProjects,
  accountProjectTags,
  accountRoles,
  accountRoleAuditLogs,
  accountTags,
  accounts,
  apiKeys,
  apiKeyAuditLogs,
  groupPermissions,
  groupTags,
  groups,
  organizationGroups,
  organizationInvitations,
  organizationPermissions,
  organizationProjectApiKeyAuditLogs,
  organizationProjectApiKeys,
  organizationProjects,
  organizationProjectTags,
  organizationRoles,
  organizationTags,
  organizationUsers,
  organizations,
  permissionTags,
  permissions,
  projectAppAuditLogs,
  projectAppTagAuditLogs,
  projectAppTags,
  projectApps,
  projectGroups,
  projectRolePermissions,
  projectRolePermissionAuditLogs,
  projectUserPermissions,
  projectUserPermissionAuditLogs,
  projectUserGroups,
  projectUserGroupAuditLogs,
  resources,
  resourceAuditLogs,
  resourceTags,
  resourceTagAuditLogs,
  projectPermissions,
  projectSyncJobs,
  projectSyncJobAuditLogs,
  projectResources,
  projectResourceAuditLogs,
  projectRoles,
  signingKeyAuditLogs,
  signingKeys,
  projectTags,
  projectUserApiKeys,
  projectUserApiKeyAuditLogs,
  projectUsers,
  projects,
  roleGroups,
  rolePermissions,
  rolePermissionsAuditLogs,
  roleTags,
  roles,
  tags,
  userPermissions,
  userPermissionsAuditLogs,
  userGroups,
  userGroupsAuditLogs,
  userRoles,
  userTags,
  users,
  userAuthenticationMethods,
  userMfaFactors,
  userMfaRecoveryCodes,
  userMfaFactorAuditLogs,
  userSessions,
  accountProjectApiKeyAuditLogsRelations,
  accountProjectApiKeysRelations,
  accountProjectTagsRelations,
  accountRolesRelations,
  accountRoleAuditLogsRelations,
  accountTagsRelations,
  groupPermissionsRelations,
  groupTagsRelations,
  groupsRelations,
  organizationGroupsRelations,
  organizationInvitationsRelations,
  organizationPermissionsRelations,
  organizationProjectApiKeyAuditLogsRelations,
  organizationProjectApiKeysRelations,
  organizationProjectsRelations,
  organizationProjectTagsRelations,
  organizationRolesRelations,
  organizationTagsRelations,
  organizationUsersRelations,
  organizationsRelations,
  permissionTagsRelations,
  permissionsRelations,
  projectAppAuditLogsRelations,
  projectAppTagsRelations,
  projectAppsRelations,
  projectGroupsRelations,
  projectRolePermissionsRelations,
  projectUserPermissionsRelations,
  projectUserGroupsRelations,
  resourcesRelations,
  resourceAuditLogsRelations,
  resourceTagsRelations,
  projectPermissionsRelations,
  projectSyncJobsRelations,
  projectSyncJobAuditLogsRelations,
  projectResourcesRelations,
  projectResourceAuditLogsRelations,
  projectRolesRelations,
  signingKeyAuditLogsRelations,
  projectTagsRelations,
  projectUserApiKeysRelations,
  projectUserApiKeyAuditLogsRelations,
  projectUsersRelations,
  apiKeysRelations,
  apiKeyAuditLogsRelations,
  projectsRelations,
  roleGroupsRelations,
  rolePermissionsRelations,
  roleTagsRelations,
  rolesRelations,
  userPermissionsRelations,
  userGroupsRelations,
  userRolesRelations,
  userTagsRelations,
  usersRelations,
  accountProjectsRelations,
  accountsRelations,
  userAuthenticationMethodsRelations,
  userMfaFactorsRelations,
  userMfaRecoveryCodesRelations,
  userSessionsRelations,
};

export type Schema = typeof schema;
