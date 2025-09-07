import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationGroupRepository } from './repository';

export function createOrganizationGroupRepository(db: DbSchema) {
  return new OrganizationGroupRepository(db);
}
