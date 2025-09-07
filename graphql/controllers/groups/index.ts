import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { GroupController } from './controller';

export function createGroupController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new GroupController(scopeCache, services, db);
}
