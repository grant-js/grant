import { DbSchema } from '@logusgraphics/grant-database';

import { TagRepository } from './repository';

export function createTagRepository(db: DbSchema) {
  return new TagRepository(db);
}
