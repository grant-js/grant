import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { GroupPermissionRepository } from './repository';

export function createGroupPermissionRepository(db: DbSchema) {
  return new GroupPermissionRepository(db);
}
