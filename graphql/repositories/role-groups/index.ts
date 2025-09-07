import { DbSchema } from '@/graphql/lib/database/connection';

import { RoleGroupRepository } from './repository';

export function createRoleGroupRepository(db: DbSchema) {
  return new RoleGroupRepository(db);
}
