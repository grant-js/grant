import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { RoleTagService } from './service';

export function createRoleTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new RoleTagService(repositories, user, db);
}
