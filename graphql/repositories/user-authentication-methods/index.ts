import { DbSchema } from '@/graphql/lib/database/connection';

import { UserAuthenticationMethodRepository } from './repository';

export * from './schema';
export * from './repository';

export function createUserAuthenticationMethodRepository(db: DbSchema) {
  return new UserAuthenticationMethodRepository(db);
}
