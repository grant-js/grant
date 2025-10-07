import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationRepository } from './repository';

export function createOrganizationRepository(db: DbSchema) {
  return new OrganizationRepository(db);
}
