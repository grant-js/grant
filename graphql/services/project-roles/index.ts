import { DbSchema } from '@/graphql/lib/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectRoleService } from './service';

export function createProjectRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new ProjectRoleService(repositories, user, db);
}
