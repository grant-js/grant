import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { RoleController } from './controller';

export function createRoleController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new RoleController(scopeCache, services, db);
}
