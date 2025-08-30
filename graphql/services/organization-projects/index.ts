import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationProjectService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createOrganizationProjectService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new OrganizationProjectService(repositories, user, db);
}
