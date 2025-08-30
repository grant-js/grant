import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { RoleTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createRoleTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new RoleTagService(repositories, user, db);
}
