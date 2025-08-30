import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IRoleRepository } from './interface';
import { RoleRepository } from './repository';

// Factory function for creating instances with database connections
export function createRoleRepository(db: PostgresJsDatabase): IRoleRepository {
  return new RoleRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
