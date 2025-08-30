import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectUserService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createProjectUserService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new ProjectUserService(repositories, user, db);
}
