import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationGroupRepository } from './repository';

export function createOrganizationGroupRepository(db: DbSchema) {
  return new OrganizationGroupRepository(db);
}
