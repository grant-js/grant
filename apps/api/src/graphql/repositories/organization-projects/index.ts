import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationProjectRepository } from './repository';

export function createOrganizationProjectRepository(db: DbSchema) {
  return new OrganizationProjectRepository(db);
}
