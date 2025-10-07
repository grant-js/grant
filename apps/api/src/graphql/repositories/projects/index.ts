import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectRepository } from './repository';

export function createProjectRepository(db: DbSchema) {
  return new ProjectRepository(db);
}
