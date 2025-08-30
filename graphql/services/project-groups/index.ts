import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectGroupService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createProjectGroupService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new ProjectGroupService(repositories, user, db);
}
