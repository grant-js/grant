import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationTagRepository } from './repository';

export function createOrganizationTagRepository(db: DbSchema) {
  return new OrganizationTagRepository(db);
}
