import * as groupPermissionQueries from './group-permissions/queries';
import * as groupTagQueries from './group-tags/queries';
import * as groupQueries from './groups/queries';
import * as organizationGroupQueries from './organization-groups/queries';
import * as organizationPermissionQueries from './organization-permissions/queries';
import * as organizationProjectQueries from './organization-projects/queries';
import * as organizationRoleQueries from './organization-roles/queries';
import * as organizationUserQueries from './organization-users/queries';
import * as organizationQueries from './organizations/queries';
import * as permissionTagQueries from './permission-tags/queries';
import * as permissionQueries from './permissions/queries';
import * as projectQueries from './projects/queries';
import * as roleGroupQueries from './role-groups/queries';
import * as roleTagQueries from './role-tags/queries';
import * as roleQueries from './roles/queries';
import * as tagQueries from './tags/queries';
import * as userRoleQueries from './user-roles/queries';
import * as userTagQueries from './user-tags/queries';
import * as userQueries from './users/queries';

export const Query = {
  _empty: () => null,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  organizations: organizationQueries.getOrganizations,
  projects: projectQueries.getProjects,
  permissions: permissionQueries.getPermissions,
  userRoles: userRoleQueries.getUserRoles,
  roleGroups: roleGroupQueries.getRoleGroups,
  groupPermissions: groupPermissionQueries.getGroupPermissions,
  tags: tagQueries.getTags,
  userTags: userTagQueries.getUserTags,
  roleTags: roleTagQueries.getRoleTags,
  groupTags: groupTagQueries.getGroupTags,
  permissionTags: permissionTagQueries.getPermissionTags,
  organizationProjects: organizationProjectQueries.getOrganizationProjects,
  organizationRoles: organizationRoleQueries.organizationRoles,
  organizationGroups: organizationGroupQueries.organizationGroups,
  organizationPermissions: organizationPermissionQueries.organizationPermissions,
  organizationUsers: organizationUserQueries.organizationUsers,
} as const;
