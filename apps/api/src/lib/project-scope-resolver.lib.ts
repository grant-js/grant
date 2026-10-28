import type { IAccountProjectRepository, IOrganizationProjectRepository } from '@grantjs/core';
import { type Scope, Tenant } from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * The explicit tenant scope of a project (`OrganizationProject` first, then
 * `AccountProject`), for events published outside a request's auth context. `undefined`
 * when the project is linked to neither.
 */
export async function resolveProjectScope(
  repositories: {
    organizationProjects: Pick<IOrganizationProjectRepository, 'getFirstByProjectId'>;
    accountProjects: Pick<IAccountProjectRepository, 'getFirstByProjectId'>;
  },
  projectId: string,
  transaction?: Transaction
): Promise<Scope | undefined> {
  const orgProject = await repositories.organizationProjects.getFirstByProjectId(
    projectId,
    transaction
  );
  if (orgProject) {
    return {
      tenant: Tenant.OrganizationProject,
      id: `${orgProject.organizationId}:${projectId}`,
    };
  }

  const accountProject = await repositories.accountProjects.getFirstByProjectId(
    projectId,
    transaction
  );
  if (accountProject) {
    return {
      tenant: Tenant.AccountProject,
      id: `${accountProject.accountId}:${projectId}`,
    };
  }

  return undefined;
}
