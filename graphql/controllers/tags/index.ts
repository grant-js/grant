import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Services } from '@/graphql/services';

import { TagController } from './controller';

export function createTagController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new TagController(scopeCache, services, db);
}
