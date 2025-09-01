import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { ProjectRepository } from './repository';

export function createProjectRepository(db: DbSchema) {
  return new ProjectRepository(db);
}
