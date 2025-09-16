import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { AccountController } from './controller';

export function createAccountController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new AccountController(scopeCache, services, db);
}
