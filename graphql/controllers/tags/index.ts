import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Services } from '@/graphql/services';

import { TagController } from './controller';

export function createTagController(scopeCache: EntityCache, services: Services, db: DbSchema) {
  return new TagController(scopeCache, services, db);
}
