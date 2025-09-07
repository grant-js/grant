import { DbSchema } from '@/graphql/lib/database/connection';

import { ProjectRepository } from './repository';

export function createProjectRepository(db: DbSchema) {
  return new ProjectRepository(db);
}
