import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { GroupController } from './controller';

export function createGroupController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new GroupController(scopeCache, services, db);
}
