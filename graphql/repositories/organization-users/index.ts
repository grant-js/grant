import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationUserRepository } from './interface';
import { OrganizationUserRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationUserRepository(
  db: PostgresJsDatabase
): IOrganizationUserRepository {
  return new OrganizationUserRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
