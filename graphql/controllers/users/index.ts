import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { UserController } from './controller';

export function createUserController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new UserController(scopeCache, services, db);
}
