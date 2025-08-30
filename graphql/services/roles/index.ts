import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { RoleService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new RoleService(repositories, user, db);
}
