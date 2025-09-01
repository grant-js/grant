import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { OrganizationRepository } from './repository';

export function createOrganizationRepository(db: DbSchema) {
  return new OrganizationRepository(db);
}
