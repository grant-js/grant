import { DbSchema } from '@logusgraphics/grant-database';

import { GroupPermissionRepository } from './repository';

export function createGroupPermissionRepository(db: DbSchema) {
  return new GroupPermissionRepository(db);
}
