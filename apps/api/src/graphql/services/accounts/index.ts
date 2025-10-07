import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { AccountService } from './service';

export function createAccountService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new AccountService(repositories, user, db);
}
