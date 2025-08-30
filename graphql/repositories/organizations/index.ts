import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IOrganizationRepository } from './interface';
import { OrganizationRepository } from './repository';

// Factory function for creating instances with database connections
export function createOrganizationRepository(db: PostgresJsDatabase): IOrganizationRepository {
  return new OrganizationRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
