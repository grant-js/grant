import { DbSchema } from '@/graphql/lib/database/connection';

import { GroupTagRepository } from './repository';

export function createGroupTagRepository(db: DbSchema) {
  return new GroupTagRepository(db);
}
