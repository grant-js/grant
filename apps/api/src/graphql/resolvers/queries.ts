import * as accountQueries from './accounts/queries';
import * as groupQueries from './groups/queries';
import * as organizationInvitationQueries from './organization-invitations/queries';
import * as organizationQueries from './organizations/queries';
import * as permissionQueries from './permissions/queries';
import * as projectQueries from './projects/queries';
import * as roleQueries from './roles/queries';
import * as tagQueries from './tags/queries';
import * as userQueries from './users/queries';
export const Query = {
  _empty: () => null,
  accounts: accountQueries.getAccounts,
  checkUsername: accountQueries.checkUsername,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  organizations: organizationQueries.getOrganizations,
  organizationInvitations: organizationInvitationQueries.organizationInvitations,
  invitation: organizationInvitationQueries.invitation,
  projects: projectQueries.getProjects,
  permissions: permissionQueries.getPermissions,
  tags: tagQueries.getTags,
} as const;
