import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { PermissionService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createPermissionService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new PermissionService(repositories, user, db);
}
