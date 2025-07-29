import * as userQueries from './users/queries';
import * as roleQueries from './roles/queries';
import * as groupQueries from './groups/queries';
import * as permissionQueries from './permissions/queries';
import * as userRoleQueries from './user-roles/queries';
import * as roleGroupQueries from './role-groups/queries';
import * as groupPermissionQueries from './group-permissions/queries';
import * as tagQueries from './tags/queries';
import * as userTagQueries from './user-tags/queries';
import * as roleTagQueries from './role-tags/queries';
import * as groupTagQueries from './group-tags/queries';

export const Query = {
  _empty: () => null,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  permissions: permissionQueries.getPermissions,
  userRoles: userRoleQueries.getUserRoles,
  roleGroups: roleGroupQueries.getRoleGroups,
  groupPermissions: groupPermissionQueries.getGroupPermissions,
  tags: tagQueries.getTags,
  userTags: userTagQueries.getUserTags,
  roleTags: roleTagQueries.getRoleTags,
  groupTags: groupTagQueries.getGroupTags,
} as const;
