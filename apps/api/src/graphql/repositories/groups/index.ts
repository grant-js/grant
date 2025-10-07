import { DbSchema } from '@logusgraphics/grant-database';

import { GroupRepository } from './repository';

export function createGroupRepository(db: DbSchema) {
  return new GroupRepository(db);
}
