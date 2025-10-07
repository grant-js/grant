import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectUserService } from './service';

export function createProjectUserService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new ProjectUserService(repositories, user, db);
}
