import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationRoleRepository } from './repository';

export function createOrganizationRoleRepository(db: DbSchema) {
  return new OrganizationRoleRepository(db);
}
