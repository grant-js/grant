import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { authenticateGraphQLResolver, authorizeGraphQLResolver } from '@/lib/authorization';

import * as apiKeyQueries from './api-keys/queries';
import * as authQueries from './auth/queries';
import * as groupQueries from './groups/queries';
import * as meQueries from './me/queries';
import * as organizationInvitationQueries from './organization-invitations/queries';
import * as organizationMemberQueries from './organization-members/queries';
import * as organizationQueries from './organizations/queries';
import * as permissionQueries from './permissions/queries';
import * as projectQueries from './projects/queries';
import * as resourceQueries from './resources/queries';
import * as roleQueries from './roles/queries';
import * as tagQueries from './tags/queries';
import * as userQueries from './users/queries';

export const Query = {
  _empty: () => null,

  // Auth (authenticated)
  isAuthorized: authenticateGraphQLResolver(authQueries.isAuthorized!),
  // Me (authenticated)
  me: authenticateGraphQLResolver(meQueries.me!),
  myUserAuthenticationMethods: authenticateGraphQLResolver(meQueries.myUserAuthenticationMethods!),
  myUserDataExport: authenticateGraphQLResolver(meQueries.myUserDataExport!),
  myUserSessions: authenticateGraphQLResolver(meQueries.myUserSessions!),
  // Organization (scoped)
  organizationInvitations: authorizeGraphQLResolver(
    {
      resource: ResourceSlug.OrganizationInvitation,
      action: ResourceAction.Query,
    },
    organizationInvitationQueries.organizationInvitations!
  ),
  organizationMembers: authorizeGraphQLResolver(
    {
      resource: ResourceSlug.OrganizationMember,
      action: ResourceAction.Query,
    },
    organizationMemberQueries.organizationMembers!
  ),
  organizations: authorizeGraphQLResolver(
    { resource: ResourceSlug.Organization, action: ResourceAction.Query },
    organizationQueries.getOrganizations!
  ),
  // Organization Invitation (public)
  invitation: organizationInvitationQueries.invitation,
  // Projects (scoped)
  projects: authorizeGraphQLResolver(
    { resource: ResourceSlug.Project, action: ResourceAction.Query },
    projectQueries.getProjects!
  ),
  // Users (scoped)
  users: authorizeGraphQLResolver(
    { resource: ResourceSlug.User, action: ResourceAction.Query },
    userQueries.getUsers!
  ),
  // Resources (scoped)
  resources: authorizeGraphQLResolver(
    { resource: ResourceSlug.Resource, action: ResourceAction.Query },
    resourceQueries.resources!
  ),
  // Roles (scoped)
  roles: authorizeGraphQLResolver(
    { resource: ResourceSlug.Role, action: ResourceAction.Query },
    roleQueries.getRoles!
  ),
  // Permissions (scoped)
  permissions: authorizeGraphQLResolver(
    { resource: ResourceSlug.Permission, action: ResourceAction.Query },
    permissionQueries.getPermissions!
  ),
  // Groups (scoped)
  groups: authorizeGraphQLResolver(
    { resource: ResourceSlug.Group, action: ResourceAction.Query },
    groupQueries.getGroups!
  ),
  // API Keys (scoped)
  apiKeys: authorizeGraphQLResolver(
    { resource: ResourceSlug.ApiKey, action: ResourceAction.Query },
    apiKeyQueries.getApiKeys!
  ),
  // Tags (scoped)
  tags: authorizeGraphQLResolver(
    { resource: ResourceSlug.Tag, action: ResourceAction.Query },
    tagQueries.getTags!
  ),
} as const;
