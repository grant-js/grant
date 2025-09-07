import { DbSchema } from '@/graphql/lib/database/connection';

import { UserRepository } from './repository';

export function createUserRepository(db: DbSchema) {
  return new UserRepository(db);
}
