import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationUserRepository } from './repository';

export function createOrganizationUserRepository(db: DbSchema) {
  return new OrganizationUserRepository(db);
}
