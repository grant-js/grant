import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { OrganizationController } from './controller';

export function createOrganizationController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new OrganizationController(scopeCache, services, db);
}
