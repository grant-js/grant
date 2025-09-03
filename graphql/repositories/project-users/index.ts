import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { ProjectUserRepository } from './repository';

export function createProjectUserRepository(db: DbSchema) {
  return new ProjectUserRepository(db);
}
