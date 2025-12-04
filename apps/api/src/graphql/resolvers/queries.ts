import * as accountQueries from './accounts/queries';
import * as authQueries from './auth/queries';
import * as groupQueries from './groups/queries';
import * as organizationInvitationQueries from './organization-invitations/queries';
import * as organizationMemberQueries from './organization-members/queries';
import * as organizationQueries from './organizations/queries';
import * as permissionQueries from './permissions/queries';
import * as projectQueries from './projects/queries';
import * as roleQueries from './roles/queries';
import * as tagQueries from './tags/queries';
import * as userAuthenticationMethodQueries from './user-authentication-methods/queries';
import * as userSessionQueries from './user-sessions/queries';
import * as userQueries from './users/queries';
export const Query = {
  _empty: () => null,
  accounts: accountQueries.getAccounts,
  exportUserData: userQueries.exportUserData,
  users: userQueries.getUsers,
  roles: roleQueries.getRoles,
  groups: groupQueries.getGroups,
  organizations: organizationQueries.getOrganizations,
  organizationInvitations: organizationInvitationQueries.organizationInvitations,
  invitation: organizationInvitationQueries.invitation,
  organizationMembers: organizationMemberQueries.organizationMembers,
  projects: projectQueries.getProjects,
  permissions: permissionQueries.getPermissions,
  tags: tagQueries.getTags,
  userAuthenticationMethods: userAuthenticationMethodQueries.userAuthenticationMethods,
  userSessions: userSessionQueries.userSessions,
  me: authQueries.me,
} as const;
