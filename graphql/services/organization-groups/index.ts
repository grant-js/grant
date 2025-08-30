import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationGroupService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createOrganizationGroupService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new OrganizationGroupService(repositories, user, db);
}
