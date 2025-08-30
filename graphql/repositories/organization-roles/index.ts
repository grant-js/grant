import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationRoleRepository } from './interface';
import { OrganizationRoleRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationRoleRepository(
  db: PostgresJsDatabase
): IOrganizationRoleRepository {
  return new OrganizationRoleRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
