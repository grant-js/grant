import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IUserRepository } from './interface';
import { UserRepository } from './repository';

// Factory function for creating instances with database connections
export function createUserRepository(db: PostgresJsDatabase): IUserRepository {
  return new UserRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
