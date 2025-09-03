import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { ProjectRoleRepository } from './repository';

export function createProjectRoleRepository(db: DbSchema) {
  return new ProjectRoleRepository(db);
}
