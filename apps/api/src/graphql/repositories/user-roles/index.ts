import { DbSchema } from '@logusgraphics/grant-database';

import { UserRoleRepository } from './repository';

export function createUserRoleRepository(db: DbSchema) {
  return new UserRoleRepository(db);
}
