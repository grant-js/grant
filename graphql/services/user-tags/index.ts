import { DbSchema } from '@/graphql/lib/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserTagService } from './service';

export function createUserTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new UserTagService(repositories, user, db);
}
