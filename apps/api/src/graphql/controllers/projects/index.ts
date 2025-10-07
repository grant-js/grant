import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { ProjectController } from './controller';

export function createProjectController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new ProjectController(scopeCache, services, db);
}
