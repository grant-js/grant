import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { GroupTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createGroupTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new GroupTagService(repositories, user, db);
}
