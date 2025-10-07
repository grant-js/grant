import { DbSchema } from '@logusgraphics/grant-database';

import { AccountProjectRepository } from './repository';

export * from './repository';

export function createAccountProjectRepository(db: DbSchema) {
  return new AccountProjectRepository(db);
}
