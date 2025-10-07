import { DbSchema } from '@logusgraphics/grant-database';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { RoleService } from './service';

export function createRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new RoleService(repositories, user, db);
}
