import { accountProjects, accountProjectsRelations } from './account-projects/schema';
import { accounts, accountsRelations } from './accounts/schema';
import { groupPermissions, groupPermissionsRelations } from './group-permissions/schema';
import { groupTags, groupTagsRelations } from './group-tags/schema';
import { groups, groupsRelations } from './groups/schema';
import { organizationGroups, organizationGroupsRelations } from './organization-groups/schema';
import {
  organizationPermissions,
  organizationPermissionsRelations,
} from './organization-permissions/schema';
import {
  organizationProjects,
  organizationProjectsRelations,
} from './organization-projects/schema';
import { organizationRoles, organizationRolesRelations } from './organization-roles/schema';
import { organizationTags, organizationTagsRelations } from './organization-tags/schema';
import { organizationUsers, organizationUsersRelations } from './organization-users/schema';
import { organizations, organizationsRelations } from './organizations/schema';
import { permissionTags, permissionTagsRelations } from './permission-tags/schema';
import { permissions, permissionsRelations } from './permissions/schema';
import { projectGroups, projectGroupsRelations } from './project-groups/schema';
import { projectPermissions, projectPermissionsRelations } from './project-permissions/schema';
import { projectRoles, projectRolesRelations } from './project-roles/schema';
import { projectTags, projectTagsRelations } from './project-tags/schema';
import { projectUsers, projectUsersRelations } from './project-users/schema';
import { projects, projectsRelations } from './projects/schema';
import { roleGroups, roleGroupsRelations } from './role-groups/schema';
import { roleTags, roleTagsRelations } from './role-tags/schema';
import { roles, rolesRelations } from './roles/schema';
import { tags } from './tags/schema';
import {
  userAuthenticationMethods,
  userAuthenticationMethodsRelations,
} from './user-authentication-methods/schema';
import { userRoles, userRolesRelations } from './user-roles/schema';
import { userSessions, userSessionsRelations } from './user-sessions/schema';
import { userTags, userTagsRelations } from './user-tags/schema';
import { users, usersRelations } from './users/schema';

// New authentication entities

export const schema = {
  accountProjects,
  accounts,
  groupPermissions,
  groupTags,
  groups,
  organizationGroups,
  organizationPermissions,
  organizationProjects,
  organizationRoles,
  organizationTags,
  organizationUsers,
  organizations,
  permissionTags,
  permissions,
  projectGroups,
  projectPermissions,
  projectRoles,
  projectTags,
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
  groupPermissionsRelations,
  groupTagsRelations,
  groupsRelations,
  organizationGroupsRelations,
  organizationPermissionsRelations,
  organizationProjectsRelations,
  organizationRolesRelations,
  organizationTagsRelations,
  organizationUsersRelations,
  organizationsRelations,
  permissionTagsRelations,
  permissionsRelations,
  projectGroupsRelations,
  projectPermissionsRelations,
  projectRolesRelations,
  projectTagsRelations,
  projectUsersRelations,
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
