import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { AccountController } from './controller';

export function createAccountController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new AccountController(scopeCache, services, db);
}
