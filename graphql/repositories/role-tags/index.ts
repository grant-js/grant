import { DbSchema } from '@/graphql/lib/database/connection';

import { RoleTagRepository } from './repository';

export function createRoleTagRepository(db: DbSchema) {
  return new RoleTagRepository(db);
}
