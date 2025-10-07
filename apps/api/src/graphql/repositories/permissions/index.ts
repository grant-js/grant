import { DbSchema } from '@logusgraphics/grant-database';

import { PermissionRepository } from './repository';

export function createPermissionRepository(db: DbSchema) {
  return new PermissionRepository(db);
}
