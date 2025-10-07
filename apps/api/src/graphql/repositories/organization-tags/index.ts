import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationTagRepository } from './repository';

export function createOrganizationTagRepository(db: DbSchema) {
  return new OrganizationTagRepository(db);
}
