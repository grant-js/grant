import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IRoleGroupRepository } from './interface';
import { RoleGroupRepository } from './repository';

// Factory function for creating instances with database connections
export function createRoleGroupRepository(db: PostgresJsDatabase): IRoleGroupRepository {
  return new RoleGroupRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
