import { DbSchema } from '@logusgraphics/grant-database';

import { OrganizationPermissionRepository } from './repository';

export function createOrganizationPermissionRepository(db: DbSchema) {
  return new OrganizationPermissionRepository(db);
}
