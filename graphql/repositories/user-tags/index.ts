import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IUserTagRepository } from './interface';
import { UserTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createUserTagRepository(db: PostgresJsDatabase): IUserTagRepository {
  return new UserTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
