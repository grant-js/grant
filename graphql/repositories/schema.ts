import { groupPermissions } from './group-permissions/schema';
import { groupTags } from './group-tags/schema';
import { groups } from './groups/schema';
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
import { permissionTags } from './permission-tags/schema';
import { permissions } from './permissions/schema';
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
import { userRoles, userRolesRelations } from './user-roles/schema';
import { userTags, userTagsRelations } from './user-tags/schema';
import { users, usersRelations } from './users/schema';

export const schema = {
  projects,
  tags,
  users,
  roles,
  permissions,
  groups,
  organizations,
  projectTags,
  projectUsers,
  projectGroups,
  projectRoles,
  projectPermissions,
  userRoles,
  userTags,
  groupPermissions,
  groupTags,
  organizationUsers,
  organizationGroups,
  organizationRoles,
  organizationTags,
  organizationProjects,
  organizationPermissions,
  roleGroups,
  roleTags,
  permissionTags,
  projectsRelations,
  projectTagsRelations,
  projectUsersRelations,
  projectRolesRelations,
  projectPermissionsRelations,
  projectGroupsRelations,
  usersRelations,
  userRolesRelations,
  userTagsRelations,
  rolesRelations,
  roleTagsRelations,
  roleGroupsRelations,
  organizationsRelations,
  organizationGroupsRelations,
  organizationPermissionsRelations,
  organizationProjectsRelations,
  organizationRolesRelations,
  organizationTagsRelations,
  organizationUsersRelations,
};

export type Schema = typeof schema;
