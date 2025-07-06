import * as userQueries from './users/queries';
import * as roleQueries from './roles/queries';
import * as groupQueries from './groups/queries';
import * as permissionQueries from './permissions/queries';

export const Query = {
  _empty: () => null,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  permissions: permissionQueries.getPermissions,
} as const;
