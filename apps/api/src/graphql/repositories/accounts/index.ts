import { DbSchema } from '@logusgraphics/grant-database';

import { AccountRepository } from './repository';

export * from './repository';

export function createAccountRepository(db: DbSchema) {
  return new AccountRepository(db);
}
