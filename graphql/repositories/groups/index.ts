import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IGroupRepository } from './interface';
import { GroupRepository } from './repository';

// Factory function for creating instances with database connections
export function createGroupRepository(db: PostgresJsDatabase): IGroupRepository {
  return new GroupRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
