import { DbSchema } from '@/graphql/lib/database/connection';

import { PermissionTagRepository } from './repository';

export function createPermissionTagRepository(db: DbSchema) {
  return new PermissionTagRepository(db);
}
