import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { ProjectController } from './controller';

export function createProjectController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new ProjectController(scopeCache, services, db);
}
