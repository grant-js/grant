import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { GroupPermissionService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createGroupPermissionService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new GroupPermissionService(repositories, user, db);
}
