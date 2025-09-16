import { DbSchema } from '@/graphql/lib/database/connection';

import { AccountProjectRepository } from './repository';

export * from './schema';
export * from './repository';

export function createAccountProjectRepository(db: DbSchema) {
  return new AccountProjectRepository(db);
}
