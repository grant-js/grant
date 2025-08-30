import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectRoleRepository } from './interface';
import { ProjectRoleRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectRoleRepository(db: PostgresJsDatabase): IProjectRoleRepository {
  return new ProjectRoleRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
