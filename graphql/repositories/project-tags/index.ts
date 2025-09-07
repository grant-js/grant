import { DbSchema } from '@/graphql/lib/database/connection';

import { ProjectTagRepository } from './repository';

export function createProjectTagRepository(db: DbSchema) {
  return new ProjectTagRepository(db);
}
