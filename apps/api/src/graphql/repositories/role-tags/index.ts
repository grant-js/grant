import { DbSchema } from '@logusgraphics/grant-database';

import { RoleTagRepository } from './repository';

export function createRoleTagRepository(db: DbSchema) {
  return new RoleTagRepository(db);
}
