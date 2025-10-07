import { DbSchema } from '@logusgraphics/grant-database';

import { PermissionTagRepository } from './repository';

export function createPermissionTagRepository(db: DbSchema) {
  return new PermissionTagRepository(db);
}
