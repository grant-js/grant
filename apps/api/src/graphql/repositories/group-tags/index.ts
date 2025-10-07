import { DbSchema } from '@logusgraphics/grant-database';

import { GroupTagRepository } from './repository';

export function createGroupTagRepository(db: DbSchema) {
  return new GroupTagRepository(db);
}
