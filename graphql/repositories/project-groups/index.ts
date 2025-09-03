import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { ProjectGroupRepository } from './repository';

export function createProjectGroupRepository(db: DbSchema) {
  return new ProjectGroupRepository(db);
}
