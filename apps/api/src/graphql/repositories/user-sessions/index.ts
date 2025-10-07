import { DbSchema } from '@logusgraphics/grant-database';

import { UserSessionRepository } from './repository';

export * from './repository';

export function createUserSessionRepository(db: DbSchema) {
  return new UserSessionRepository(db);
}
