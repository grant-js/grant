import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { GroupRepository } from './repository';

export function createGroupRepository(db: DbSchema) {
  return new GroupRepository(db);
}
