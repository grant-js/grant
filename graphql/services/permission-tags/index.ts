import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { PermissionTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createPermissionTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new PermissionTagService(repositories, user, db);
}
