import { DbSchema } from '@logusgraphics/grant-database';

import { IEntityCacheAdapter } from '@/lib/cache/cache-adapter.interface';
import { Services } from '@/services';

import { AccountHandler } from './accounts.handler';
import { ApiKeysHandler } from './api-keys.handler';
import { GroupHandler } from './groups.handler';
import { OAuthHandler } from './oauth.handler';
import { OrganizationInvitationsHandler } from './organization-invitations.handler';
import { OrganizationMembersHandler } from './organization-members.handler';
import { OrganizationHandler } from './organizations.handler';
import { PermissionHandler } from './permissions.handler';
import { ProjectHandler } from './projects.handler';
import { RoleHandler } from './roles.handler';
import { TagHandler } from './tags.handler';
import { UserHandler } from './users.handler';

export type Handlers = ReturnType<typeof createHandlers>;

export function createHandlers(cache: IEntityCacheAdapter, services: Services, db: DbSchema) {
  return {
    accounts: new AccountHandler(cache, services, db),
    oauth: new OAuthHandler(cache, services, db),
    organizationInvitations: new OrganizationInvitationsHandler(services, db),
    organizationMembers: new OrganizationMembersHandler(services, db),
    organizations: new OrganizationHandler(cache, services, db),
    projects: new ProjectHandler(cache, services, db),
    apiKeys: new ApiKeysHandler(cache, services, db),
    users: new UserHandler(cache, services, db),
    roles: new RoleHandler(cache, services, db),
    groups: new GroupHandler(cache, services, db),
    permissions: new PermissionHandler(cache, services, db),
    tags: new TagHandler(cache, services, db),
  };
}
