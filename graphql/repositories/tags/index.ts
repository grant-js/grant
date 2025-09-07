import { DbSchema } from '@/graphql/lib/database/connection';

import { TagRepository } from './repository';

export function createTagRepository(db: DbSchema) {
  return new TagRepository(db);
}
