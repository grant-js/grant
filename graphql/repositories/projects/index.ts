import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectRepository } from './interface';
import { ProjectRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectRepository(db: PostgresJsDatabase): IProjectRepository {
  return new ProjectRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
