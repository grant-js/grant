import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationGroupRepository } from './interface';
import { OrganizationGroupRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationGroupRepository(
  db: PostgresJsDatabase
): IOrganizationGroupRepository {
  return new OrganizationGroupRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
