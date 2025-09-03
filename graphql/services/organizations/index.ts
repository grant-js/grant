import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { OrganizationService } from './service';

export function createOrganizationService(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return new OrganizationService(repositories, user, db);
}
