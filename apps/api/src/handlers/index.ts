import type { Grant, ITransactionalConnection } from '@grantjs/core';

import { IEntityCacheAdapter } from '@/lib/cache';
import type { Transaction } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';

import { ApiKeysHandler } from './api-keys.handler';
import { AuthHandler } from './auth.handler';
import { GroupHandler } from './groups.handler';
import { MeHandler } from './me.handler';
import { OAuthHandler } from './oauth.handler';
import { OrganizationInvitationsHandler } from './organization-invitations.handler';
import { OrganizationMembersHandler } from './organization-members.handler';
import { OrganizationHandler } from './organizations.handler';
import { PermissionHandler } from './permissions.handler';
import { ProjectAppsHandler } from './project-apps.handler';
import { ProjectOAuthHandler } from './project-oauth.handler';
import { ProjectHandler } from './projects.handler';
import { ResourceHandler } from './resources.handler';
import { RoleHandler } from './roles.handler';
import { SigningKeysHandler } from './signing-keys.handler';
import { TagHandler } from './tags.handler';
import { UserHandler } from './users.handler';

export type Handlers = ReturnType<typeof createHandlers>;

export function createHandlers(
  cache: IEntityCacheAdapter,
  services: Services,
  db: ITransactionalConnection<Transaction>,
  grant: Grant
) {
  const userHandler = new UserHandler(
    services.userTags,
    services.users,
    services.organizationUsers,
    services.projectUsers,
    services.userRoles,
    services.fileStorage,
    cache,
    services,
    db
  );
  const authHandler = new AuthHandler(
    services.userAuthenticationMethods,
    services.users,
    services.accounts,
    services.accountRoles,
    services.userRoles,
    services.userMfa,
    services.userSessions,
    services.email,
    services.auth,
    cache,
    services,
    db
  );

  return {
    me: new MeHandler(
      services.me,
      services.accountRoles,
      services.userRoles,
      services.accounts,
      services.users,
      services.userAuthenticationMethods,
      services.userMfa,
      services.userSessions,
      services.fileStorage,
      services.email,
      services.organizationUsers,
      services.projectUsers,
      services.auth,
      cache,
      services,
      db
    ),
    apiKeys: new ApiKeysHandler(
      services.apiKeys,
      services.accountProjectApiKeys,
      services.organizationProjectApiKeys,
      services.projectUserApiKeys,
      services.roles,
      cache,
      services,
      db
    ),
    signingKeys: new SigningKeysHandler(services.signingKeys, cache, services, db),
    auth: authHandler,
    projectOAuth: new ProjectOAuthHandler(
      services.projectApps,
      services.projectPermissions,
      services.projectUsers,
      services.userRoles,
      services.accountProjects,
      services.organizationProjects,
      services.accounts,
      services.organizationUsers,
      authHandler,
      services.githubOAuth,
      grant,
      cache,
      services.email,
      services.users,
      services.userAuthenticationMethods,
      userHandler
    ),
    groups: new GroupHandler(
      services.groupTags,
      services.groups,
      services.organizationGroups,
      services.projectGroups,
      services.groupPermissions,
      services.roleGroups,
      cache,
      services,
      db
    ),
    oauth: new OAuthHandler(
      services.githubOAuth,
      services.oauthState,
      services.userAuthenticationMethods,
      cache,
      services,
      db
    ),
    organizationInvitations: new OrganizationInvitationsHandler(
      services.organizationInvitations,
      services.userAuthenticationMethods,
      services.organizationRoles,
      services.organizations,
      services.users,
      services.roles,
      services.email,
      services.accounts,
      services.organizationUsers,
      services.userRoles,
      services.auth,
      services.accountRoles,
      db
    ),
    organizationMembers: new OrganizationMembersHandler(
      services.organizationMembers,
      cache,
      services,
      db
    ),
    organizations: new OrganizationHandler(
      services.organizations,
      services.organizationRoles,
      services.organizationUsers,
      services.userRoles,
      services.organizationProjects,
      services.organizationGroups,
      services.organizationPermissions,
      services.organizationTags,
      cache,
      services,
      db
    ),
    permissions: new PermissionHandler(
      services.permissionTags,
      services.permissions,
      services.organizationPermissions,
      services.projectPermissions,
      services.groupPermissions,
      cache,
      services,
      db
    ),
    projects: new ProjectHandler(
      services.organizationProjectTags,
      services.accountProjectTags,
      services.projects,
      services.accountProjects,
      services.organizationProjects,
      services.projectTags,
      services.projectPermissions,
      services.projectGroups,
      services.projectRoles,
      services.projectUsers,
      services.projectPermissionSync,
      cache,
      services,
      db
    ),
    projectApps: new ProjectAppsHandler(
      services.projectApps,
      services.projectAppTags,
      cache,
      services,
      db
    ),
    resources: new ResourceHandler(
      services.resourceTags,
      services.resources,
      services.projectResources,
      services.permissions,
      services.permissionTags,
      services.groupPermissions,
      services.organizationPermissions,
      services.projectPermissions,
      cache,
      services,
      db
    ),
    roles: new RoleHandler(
      services.roleTags,
      services.roles,
      services.organizationRoles,
      services.projectRoles,
      services.roleGroups,
      services.userRoles,
      cache,
      services,
      db
    ),
    tags: new TagHandler(
      services.tags,
      services.accountTags,
      services.organizationTags,
      services.projectTags,
      services.userTags,
      services.roleTags,
      services.groupTags,
      services.permissionTags,
      services.resourceTags,
      cache,
      services,
      db
    ),
    users: userHandler,
  };
}
