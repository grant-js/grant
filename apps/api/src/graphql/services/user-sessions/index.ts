import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserSessionService } from './service';

export function createUserSessionService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new UserSessionService(repositories, user, db);
}

export * from './service';
export * from './schemas';
