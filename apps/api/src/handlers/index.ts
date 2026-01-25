import { DbSchema } from '@grantjs/database';

import { IEntityCacheAdapter } from '@/lib/cache';
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
import { ProjectHandler } from './projects.handler';
import { ResourceHandler } from './resources.handler';
import { RoleHandler } from './roles.handler';
import { TagHandler } from './tags.handler';
import { UserHandler } from './users.handler';

export type Handlers = ReturnType<typeof createHandlers>;

export function createHandlers(cache: IEntityCacheAdapter, services: Services, db: DbSchema) {
  return {
    me: new MeHandler(cache, services, db),
    apiKeys: new ApiKeysHandler(cache, services, db),
    auth: new AuthHandler(cache, services, db),
    groups: new GroupHandler(cache, services, db),
    oauth: new OAuthHandler(cache, services, db),
    organizationInvitations: new OrganizationInvitationsHandler(services, db),
    organizationMembers: new OrganizationMembersHandler(cache, services, db),
    organizations: new OrganizationHandler(cache, services, db),
    permissions: new PermissionHandler(cache, services, db),
    projects: new ProjectHandler(cache, services, db),
    resources: new ResourceHandler(cache, services, db),
    roles: new RoleHandler(cache, services, db),
    tags: new TagHandler(cache, services, db),
    users: new UserHandler(cache, services, db),
  };
}
