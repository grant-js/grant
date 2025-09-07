import { DbSchema } from '@/graphql/lib/database/connection';

import { UserRoleRepository } from './repository';

export function createUserRoleRepository(db: DbSchema) {
  return new UserRoleRepository(db);
}
