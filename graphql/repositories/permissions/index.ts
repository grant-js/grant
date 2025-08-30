import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IPermissionRepository } from './interface';
import { PermissionRepository } from './repository';

// Factory function for creating instances with database connections
export function createPermissionRepository(db: PostgresJsDatabase): IPermissionRepository {
  return new PermissionRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
