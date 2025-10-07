import { DbSchema } from '@logusgraphics/grant-database';

import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { Services } from '@/graphql/services';

import { TagController } from './controller';

export function createTagController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new TagController(scopeCache, services, db);
}
