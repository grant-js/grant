import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectUserRepository } from './interface';
import { ProjectUserRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectUserRepository(db: PostgresJsDatabase): IProjectUserRepository {
  return new ProjectUserRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
