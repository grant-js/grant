import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { OrganizationProjectRepository } from './repository';

export function createOrganizationProjectRepository(db: DbSchema) {
  return new OrganizationProjectRepository(db);
}
