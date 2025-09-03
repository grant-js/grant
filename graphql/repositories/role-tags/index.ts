import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { RoleTagRepository } from './repository';

export function createRoleTagRepository(db: DbSchema) {
  return new RoleTagRepository(db);
}
