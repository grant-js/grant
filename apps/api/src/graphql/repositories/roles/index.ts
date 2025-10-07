import { DbSchema } from '@logusgraphics/grant-database';

import { RoleRepository } from './repository';

export function createRoleRepository(db: DbSchema) {
  return new RoleRepository(db);
}
