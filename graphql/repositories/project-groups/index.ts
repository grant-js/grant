import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectGroupRepository } from './interface';
import { ProjectGroupRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectGroupRepository(db: PostgresJsDatabase): IProjectGroupRepository {
  return new ProjectGroupRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
