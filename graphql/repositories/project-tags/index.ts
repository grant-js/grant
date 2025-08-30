import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IProjectTagRepository } from './interface';
import { ProjectTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createProjectTagRepository(db: PostgresJsDatabase): IProjectTagRepository {
  return new ProjectTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
