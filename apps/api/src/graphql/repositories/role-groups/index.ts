import { DbSchema } from '@logusgraphics/grant-database';

import { RoleGroupRepository } from './repository';

export function createRoleGroupRepository(db: DbSchema) {
  return new RoleGroupRepository(db);
}
