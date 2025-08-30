import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectPermissionRepository } from './interface';
import { ProjectPermissionRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectPermissionRepository(
  db: PostgresJsDatabase
): IProjectPermissionRepository {
  return new ProjectPermissionRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
