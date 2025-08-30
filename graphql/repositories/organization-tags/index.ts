import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationTagRepository } from './interface';
import { OrganizationTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationTagRepository(
  db: PostgresJsDatabase
): IOrganizationTagRepository {
  return new OrganizationTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
