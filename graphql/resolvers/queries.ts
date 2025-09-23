import * as accountQueries from './accounts/queries';
import * as groupQueries from './groups/queries';
import * as organizationQueries from './organizations/queries';
import * as permissionQueries from './permissions/queries';
import * as projectQueries from './projects/queries';
import * as roleQueries from './roles/queries';
import * as tagQueries from './tags/queries';
import * as userQueries from './users/queries';
export const Query = {
  _empty: () => null,
  accounts: accountQueries.getAccounts,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  organizations: organizationQueries.getOrganizations,
  projects: projectQueries.getProjects,
  permissions: permissionQueries.getPermissions,
  tags: tagQueries.getTags,
} as const;
