import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectTagRepository } from './repository';

export function createProjectTagRepository(db: DbSchema) {
  return new ProjectTagRepository(db);
}
