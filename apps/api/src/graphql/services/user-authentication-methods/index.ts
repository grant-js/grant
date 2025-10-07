import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserAuthenticationMethodService } from './service';

export function createUserAuthenticationMethodService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new UserAuthenticationMethodService(repositories, user, db);
}
