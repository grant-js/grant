import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationUserRepository } from './repository';

export function createOrganizationUserRepository(db: DbSchema) {
  return new OrganizationUserRepository(db);
}
