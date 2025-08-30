import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationPermissionRepository } from './interface';
import { OrganizationPermissionRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationPermissionRepository(
  db: PostgresJsDatabase
): IOrganizationPermissionRepository {
  return new OrganizationPermissionRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
