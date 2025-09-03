import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { RoleController } from './controller';

export function createRoleController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new RoleController(scopeCache, services, db);
}
