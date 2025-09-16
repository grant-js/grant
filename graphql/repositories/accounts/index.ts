import { DbSchema } from '@/graphql/lib/database/connection';

import { AccountRepository } from './repository';

export * from './schema';
export * from './repository';

export function createAccountRepository(db: DbSchema) {
  return new AccountRepository(db);
}
