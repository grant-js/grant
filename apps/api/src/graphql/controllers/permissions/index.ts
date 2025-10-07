import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { PermissionController } from './controller';

export function createPermissionController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new PermissionController(scopeCache, services, db);
}
