import { DbSchema } from '@logusgraphics/grant-database';

import { UserTagRepository } from './repository';

export function createUserTagRepository(db: DbSchema) {
  return new UserTagRepository(db);
}
