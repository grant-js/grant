import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationProjectRepository } from './interface';
import { OrganizationProjectRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationProjectRepository(
  db: PostgresJsDatabase
): IOrganizationProjectRepository {
  return new OrganizationProjectRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
