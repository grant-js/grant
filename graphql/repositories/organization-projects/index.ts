import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationProjectRepository } from './repository';

export function createOrganizationProjectRepository(db: DbSchema) {
  return new OrganizationProjectRepository(db);
}
