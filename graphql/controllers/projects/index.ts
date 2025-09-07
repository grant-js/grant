import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { ProjectController } from './controller';

export function createProjectController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new ProjectController(scopeCache, services, db);
}
