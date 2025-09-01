import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { TagRepository } from './repository';

export function createTagRepository(db: DbSchema) {
  return new TagRepository(db);
}
