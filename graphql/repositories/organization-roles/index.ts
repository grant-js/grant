import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationRoleRepository } from './repository';

export function createOrganizationRoleRepository(db: DbSchema) {
  return new OrganizationRoleRepository(db);
}
