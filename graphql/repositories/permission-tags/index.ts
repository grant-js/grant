import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { IPermissionTagRepository } from './interface';
import { PermissionTagRepository } from './repository';

// Factory function for creating instances with database connections
export function createPermissionTagRepository(db: PostgresJsDatabase): IPermissionTagRepository {
  return new PermissionTagRepository(db);
}

export * from './repository';
export * from './interface';
export * from './schema';
