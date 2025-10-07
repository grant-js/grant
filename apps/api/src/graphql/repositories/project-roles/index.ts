import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectRoleRepository } from './repository';

export function createProjectRoleRepository(db: DbSchema) {
  return new ProjectRoleRepository(db);
}
