import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IGroupPermissionRepository } from './interface';
import { GroupPermissionRepository } from './repository';

// Factory function for creating instances with database connections
export function createGroupPermissionRepository(
  db: PostgresJsDatabase
): IGroupPermissionRepository {
  return new GroupPermissionRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
