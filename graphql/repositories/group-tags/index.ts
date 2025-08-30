import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IGroupTagRepository } from './interface';
import { GroupTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createGroupTagRepository(db: PostgresJsDatabase): IGroupTagRepository {
  return new GroupTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
