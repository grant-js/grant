import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createUserTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new UserTagService(repositories, user, db);
}
