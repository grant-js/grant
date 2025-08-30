import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationTagService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createOrganizationTagService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new OrganizationTagService(repositories, user, db);
}
