import { DbSchema } from '@logusgraphics/grant-database';

import { UserAuthenticationMethodRepository } from './repository';

export * from './repository';

export function createUserAuthenticationMethodRepository(db: DbSchema) {
  return new UserAuthenticationMethodRepository(db);
}
