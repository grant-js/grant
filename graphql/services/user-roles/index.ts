import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserRoleService } from './service';

export function createUserRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new UserRoleService(repositories, user, db);
}
