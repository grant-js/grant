import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { OrganizationController } from './controller';

export function createOrganizationController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new OrganizationController(scopeCache, services, db);
}
