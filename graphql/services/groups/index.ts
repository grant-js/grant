import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { GroupService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createGroupService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new GroupService(repositories, user, db);
}
