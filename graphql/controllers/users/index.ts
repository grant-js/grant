import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { UserController } from './controller';

export function createUserController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new UserController(scopeCache, services, db);
}
