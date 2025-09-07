import { DbSchema } from '@/graphql/lib/database/connection';

import { ProjectRoleRepository } from './repository';

export function createProjectRoleRepository(db: DbSchema) {
  return new ProjectRoleRepository(db);
}
