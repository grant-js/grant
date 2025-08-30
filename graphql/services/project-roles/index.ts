import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { ProjectRoleService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createProjectRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new ProjectRoleService(repositories, user, db);
}
