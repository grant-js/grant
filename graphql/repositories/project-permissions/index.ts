import { DbSchema } from '@/graphql/lib/database/connection';

import { ProjectPermissionRepository } from './repository';

export function createProjectPermissionRepository(db: DbSchema) {
  return new ProjectPermissionRepository(db);
}
