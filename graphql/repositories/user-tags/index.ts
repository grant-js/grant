import { DbSchema } from '@/graphql/lib/database/connection';

import { UserTagRepository } from './repository';

export function createUserTagRepository(db: DbSchema) {
  return new UserTagRepository(db);
}
