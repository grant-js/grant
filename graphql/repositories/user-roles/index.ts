import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { UserRoleRepository } from './repository';

export function createUserRoleRepository(db: DbSchema) {
  return new UserRoleRepository(db);
}
