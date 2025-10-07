import { DbSchema } from '@logusgraphics/grant-database';

import { UserRepository } from './repository';

export function createUserRepository(db: DbSchema) {
  return new UserRepository(db);
}
