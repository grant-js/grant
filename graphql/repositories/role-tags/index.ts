import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IRoleTagRepository } from './interface';
import { RoleTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createRoleTagRepository(db: PostgresJsDatabase): IRoleTagRepository {
  return new RoleTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
