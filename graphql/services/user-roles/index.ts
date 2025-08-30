import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { UserRoleService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createUserRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new UserRoleService(repositories, user, db);
}
