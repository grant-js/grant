import { DbSchema } from '@/graphql/lib/providers/database/connection';

import { OrganizationUserRepository } from './repository';

export function createOrganizationUserRepository(db: DbSchema) {
  return new OrganizationUserRepository(db);
}
