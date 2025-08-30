import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { RoleGroupService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createRoleGroupService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new RoleGroupService(repositories, user, db);
}
