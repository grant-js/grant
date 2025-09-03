import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationPermissionService } from './service';

export function createOrganizationPermissionService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new OrganizationPermissionService(repositories, user, db);
}
