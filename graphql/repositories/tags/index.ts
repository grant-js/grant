import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { ITagRepository } from './interface';
import { TagRepository } from './repository';

// Factory function for creating instances with database connections
export function createTagRepository(db: PostgresJsDatabase): ITagRepository {
  return new TagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
