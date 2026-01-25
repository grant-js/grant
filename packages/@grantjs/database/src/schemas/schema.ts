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
import { projectGroups, projectGroupsRelations } from './project-groups.schema';
import { projectPermissions, projectPermissionsRelations } from './project-permissions.schema';
import {
  projectResourceAuditLogs,
  projectResourceAuditLogsRelations,
  projectResources,
  projectResourcesRelations,
} from './project-resources.schema';
import { projectRoles, projectRolesRelations } from './project-roles.schema';
import { projectTags, projectTagsRelations } from './project-tags.schema';
import {
  projectUserApiKeyAuditLogs,
  projectUserApiKeyAuditLogsRelations,
  projectUserApiKeys,
  projectUserApiKeysRelations,
} from './project-user-api-keys.schema';
import { projectUsers, projectUsersRelations } from './project-users.schema';
import { projects, projectsRelations } from './projects.schema';
import { resourceTagAuditLogs, resourceTags, resourceTagsRelations } from './resource-tags.schema';
import {
  resourceAuditLogs,
  resourceAuditLogsRelations,
  resources,
  resourcesRelations,
} from './resources.schema';
import { roleGroups, roleGroupsRelations } from './role-groups.schema';
import { roleTags, roleTagsRelations } from './role-tags.schema';
import { roles, rolesRelations } from './roles.schema';
import { tags } from './tags.schema';
import {
  userAuthenticationMethods,
  userAuthenticationMethodsRelations,
} from './user-authentication-methods.schema';
import { userRoles, userRolesRelations } from './user-roles.schema';
import { userSessions, userSessionsRelations } from './user-sessions.schema';
import { userTags, userTagsRelations } from './user-tags.schema';
import { users, usersRelations } from './users.schema';

// New authentication entities

export const schema = {
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
  organizationProjects,
  organizationProjectTags,
  organizationRoles,
  organizationTags,
  organizationUsers,
  organizations,
  permissionTags,
  permissions,
  projectGroups,
  resources,
  resourceAuditLogs,
  resourceTags,
  resourceTagAuditLogs,
  projectPermissions,
  projectResources,
  projectResourceAuditLogs,
  projectRoles,
  projectTags,
  projectUserApiKeys,
  projectUserApiKeyAuditLogs,
  projectUsers,
  projects,
  roleGroups,
  roleTags,
  roles,
  tags,
  userRoles,
  userTags,
  users,
  userAuthenticationMethods,
  userSessions,
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
  organizationProjectsRelations,
  organizationProjectTagsRelations,
  organizationRolesRelations,
  organizationTagsRelations,
  organizationUsersRelations,
  organizationsRelations,
  permissionTagsRelations,
  permissionsRelations,
  projectGroupsRelations,
  resourcesRelations,
  resourceAuditLogsRelations,
  resourceTagsRelations,
  projectPermissionsRelations,
  projectResourcesRelations,
  projectResourceAuditLogsRelations,
  projectRolesRelations,
  projectTagsRelations,
  projectUserApiKeysRelations,
  projectUserApiKeyAuditLogsRelations,
  projectUsersRelations,
  apiKeysRelations,
  apiKeyAuditLogsRelations,
  projectsRelations,
  roleGroupsRelations,
  roleTagsRelations,
  rolesRelations,
  userRolesRelations,
  userTagsRelations,
  usersRelations,
  accountProjectsRelations,
  accountsRelations,
  userAuthenticationMethodsRelations,
  userSessionsRelations,
};

export type Schema = typeof schema;
