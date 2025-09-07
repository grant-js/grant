import { DbSchema } from '@/graphql/lib/database/connection';

import { RoleRepository } from './repository';

export function createRoleRepository(db: DbSchema) {
  return new RoleRepository(db);
}
