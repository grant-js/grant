import { DbSchema } from '@logusgraphics/grant-database';

import { ProjectPermissionRepository } from './repository';

export function createProjectPermissionRepository(db: DbSchema) {
  return new ProjectPermissionRepository(db);
}
