import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationRoleService } from './service';

export * from './interface';
export * from './service';
export * from './schemas';

export function createOrganizationRoleService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: PostgresJsDatabase
) {
  return new OrganizationRoleService(repositories, user, db);
}
