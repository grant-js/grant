import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { PermissionController } from './controller';

export function createPermissionController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new PermissionController(scopeCache, services, db);
}
