import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationRepository } from './repository';

export function createOrganizationRepository(db: DbSchema) {
  return new OrganizationRepository(db);
}
