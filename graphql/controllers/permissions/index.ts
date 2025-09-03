import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { PermissionController } from './controller';

export function createPermissionController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new PermissionController(scopeCache, services, db);
}
