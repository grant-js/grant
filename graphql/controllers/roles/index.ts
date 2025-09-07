import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { RoleController } from './controller';

export function createRoleController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new RoleController(scopeCache, services, db);
}
