import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { AccountProjectService } from './service';

export function createAccountProjectService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new AccountProjectService(repositories, user, db);
}
