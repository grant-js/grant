import { DbSchema } from '@/graphql/lib/database/connection';

import { OrganizationPermissionRepository } from './repository';

export function createOrganizationPermissionRepository(db: DbSchema) {
  return new OrganizationPermissionRepository(db);
}
