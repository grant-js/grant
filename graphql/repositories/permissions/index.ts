import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { PermissionRepository } from './repository';

export function createPermissionRepository(db: DbSchema) {
  return new PermissionRepository(db);
}
