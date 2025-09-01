import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { RoleRepository } from './repository';

export function createRoleRepository(db: DbSchema) {
  return new RoleRepository(db);
}
