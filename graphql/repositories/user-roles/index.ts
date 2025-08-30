import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IUserRoleRepository } from './interface';
import { UserRoleRepository } from './repository';

// Factory function for creating instances with database connections
export function createUserRoleRepository(db: PostgresJsDatabase): IUserRoleRepository {
  return new UserRoleRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
