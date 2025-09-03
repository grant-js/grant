import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { GroupTagRepository } from './repository';

export function createGroupTagRepository(db: DbSchema) {
  return new GroupTagRepository(db);
}
