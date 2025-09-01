import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { UserRepository } from './repository';

export function createUserRepository(db: DbSchema) {
  return new UserRepository(db);
}
