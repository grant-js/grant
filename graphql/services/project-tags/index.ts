import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createProjectTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new ProjectTagService(repositories, user, db);
}
