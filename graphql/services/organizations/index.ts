import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createOrganizationService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new OrganizationService(repositories, user, db);
}
