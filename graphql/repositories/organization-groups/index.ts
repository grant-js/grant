import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { OrganizationGroupRepository } from './repository';

export function createOrganizationGroupRepository(db: DbSchema) {
  return new OrganizationGroupRepository(db);
}
