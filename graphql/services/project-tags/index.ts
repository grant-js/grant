import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectTagService } from './service';

export function createProjectTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new ProjectTagService(repositories, user, db);
}
