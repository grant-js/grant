import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { GroupController } from './controller';

export function createGroupController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new GroupController(scopeCache, services, db);
}
