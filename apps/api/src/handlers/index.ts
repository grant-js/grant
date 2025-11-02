import { DbSchema } from '@logusgraphics/grant-database';

import { IEntityCacheAdapter } from '@/lib/cache/cache-adapter.interface';
import { Services } from '@/services';

import { AccountHandler } from './accounts.handler';
import { GroupHandler } from './groups.handler';
import { OrganizationInvitationsHandler } from './organization-invitations.handler';
import { OrganizationMembersHandler } from './organization-members.handler';
import { OrganizationHandler } from './organizations.handler';
import { PermissionHandler } from './permissions.handler';
import { ProjectHandler } from './projects.handler';
import { RoleHandler } from './roles.handler';
import { TagHandler } from './tags.handler';
import { UserHandler } from './users.handler';

export type Handlers = ReturnType<typeof createHandlers>;

export function createHandlers(scopeCache: IEntityCacheAdapter, services: Services, db: DbSchema) {
  return {
    accounts: new AccountHandler(scopeCache, services, db),
    organizationInvitations: new OrganizationInvitationsHandler(services, db),
    organizationMembers: new OrganizationMembersHandler(services, db),
    organizations: new OrganizationHandler(scopeCache, services, db),
    projects: new ProjectHandler(scopeCache, services, db),
    users: new UserHandler(scopeCache, services, db),
    roles: new RoleHandler(scopeCache, services, db),
    groups: new GroupHandler(scopeCache, services, db),
    permissions: new PermissionHandler(scopeCache, services, db),
    tags: new TagHandler(scopeCache, services, db),
  };
}
