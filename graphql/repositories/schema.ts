import { groupPermissions } from './group-permissions/schema';
import { groupTags } from './group-tags/schema';
import { groups } from './groups/schema';
import { organizationGroups } from './organization-groups/schema';
import { organizationPermissions } from './organization-permissions/schema';
import { organizationProjects } from './organization-projects/schema';
import { organizationRoles } from './organization-roles/schema';
import { organizationTags } from './organization-tags/schema';
import { organizationUsers } from './organization-users/schema';
import { organizations } from './organizations/schema';
import { permissionTags } from './permission-tags/schema';
import { permissions } from './permissions/schema';
import { projectGroups, projectGroupsRelations } from './project-groups/schema';
import { projectPermissions, projectPermissionsRelations } from './project-permissions/schema';
import { projectRoles, projectRolesRelations } from './project-roles/schema';
import { projectTags, projectTagsRelations } from './project-tags/schema';
import { projectUsers, projectUsersRelations } from './project-users/schema';
import { projects, projectsRelations } from './projects/schema';
import { roleGroups } from './role-groups/schema';
import { roleTags } from './role-tags/schema';
import { roles } from './roles/schema';
import { tags } from './tags/schema';
import { userRoles } from './user-roles/schema';
import { userTags } from './user-tags/schema';
import { users } from './users/schema';

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
};

export const relations = {
  projectsRelations,
  projectTagsRelations,
  projectUsersRelations,
  projectRolesRelations,
  projectPermissionsRelations,
  projectGroupsRelations,
};

export type Schema = typeof schema;
