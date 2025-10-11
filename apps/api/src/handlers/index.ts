import { DbSchema } from '@logusgraphics/grant-database';

import { AccountHandler } from './accounts.handler';
import { EntityCache } from './base/scope-handler';
import { GroupHandler } from './groups.handler';
import { OrganizationHandler } from './organizations.handler';
import { PermissionHandler } from './permissions.handler';
import { ProjectHandler } from './projects.handler';
import { RoleHandler } from './roles.handler';
import { TagHandler } from './tags.handler';
import { UserHandler } from './users.handler';

import { Services } from '@/services';

export type Handlers = ReturnType<typeof createHandlers>;

export function createHandlers(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return {
    accounts: new AccountHandler(scopeCache, services, db),
    organizations: new OrganizationHandler(scopeCache, services, db),
    projects: new ProjectHandler(scopeCache, services, db),
    users: new UserHandler(scopeCache, services, db),
    roles: new RoleHandler(scopeCache, services, db),
    groups: new GroupHandler(scopeCache, services, db),
    permissions: new PermissionHandler(scopeCache, services, db),
    tags: new TagHandler(scopeCache, services, db),
  };
}
