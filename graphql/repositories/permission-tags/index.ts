import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { PermissionTagRepository } from './repository';

export function createPermissionTagRepository(db: DbSchema) {
  return new PermissionTagRepository(db);
}
