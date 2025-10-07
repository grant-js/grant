import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { UserController } from './controller';

export function createUserController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new UserController(scopeCache, services, db);
}
