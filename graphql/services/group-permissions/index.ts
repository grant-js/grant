import { DbSchema } from '@/graphql/lib/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { GroupPermissionService } from './service';

export function createGroupPermissionService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new GroupPermissionService(repositories, user, db);
}
