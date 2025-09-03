import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { OrganizationController } from './controller';

export function createOrganizationController(
  scopeCache: EntityCache,
  services: Services,
  db: DbSchema
) {
  return new OrganizationController(scopeCache, services, db);
}
