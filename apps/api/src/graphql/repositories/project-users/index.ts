import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectUserRepository } from './repository';

export function createProjectUserRepository(db: DbSchema) {
  return new ProjectUserRepository(db);
}
