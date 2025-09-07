import { DbSchema } from '@/graphql/lib/database/connection';

import { ProjectUserRepository } from './repository';

export function createProjectUserRepository(db: DbSchema) {
  return new ProjectUserRepository(db);
}
