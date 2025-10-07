import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectGroupRepository } from './repository';

export function createProjectGroupRepository(db: DbSchema) {
  return new ProjectGroupRepository(db);
}
