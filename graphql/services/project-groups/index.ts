import { DbSchema } from '@/graphql/lib/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectGroupService } from './service';

export function createProjectGroupService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new ProjectGroupService(repositories, user, db);
}
