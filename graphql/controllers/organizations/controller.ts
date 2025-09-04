import {
  QueryOrganizationsArgs,
  MutationCreateOrganizationArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { EntityCache } from '@/graphql/lib/scopeFiltering';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { OrganizationModel } from '@/graphql/repositories/organizations/schema';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class OrganizationController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getOrganizations(
    params: QueryOrganizationsArgs & SelectedFields<OrganizationModel>
  ): Promise<OrganizationPage> {
    const { page, limit, sort, search, ids, requestedFields } = params;

    const organizationsResult = await this.services.organizations.getOrganizations({
      ids,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return organizationsResult;
  }

  public async createOrganization(params: MutationCreateOrganizationArgs): Promise<Organization> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name } = input;

      const organization = await this.services.organizations.createOrganization({ name }, tx);

      return organization;
    });
  }

  public async updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedOrganization = await this.services.organizations.updateOrganization(params, tx);
      return updatedOrganization;
    });
  }

  public async deleteOrganization(
    params: MutationDeleteOrganizationArgs & DeleteParams
  ): Promise<Organization> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: organizationId } = params;
      const [
        organizationProjects,
        organizationUsers,
        organizationRoles,
        organizationGroups,
        organizationPermissions,
        organizationTags,
      ] = await Promise.all([
        this.services.organizationProjects.getOrganizationProjects({ organizationId }, tx),
        this.services.organizationUsers.getOrganizationUsers({ organizationId }, tx),
        this.services.organizationRoles.getOrganizationRoles({ organizationId }, tx),
        this.services.organizationGroups.getOrganizationGroups({ organizationId }, tx),
        this.services.organizationPermissions.getOrganizationPermissions({ organizationId }, tx),
        this.services.organizationTags.getOrganizationTags({ organizationId }, tx),
      ]);
      await Promise.all([
        ...organizationProjects.map((op) =>
          this.services.organizationProjects.removeOrganizationProject(
            { organizationId, projectId: op.projectId },
            tx
          )
        ),
        ...organizationUsers.map((ou) =>
          this.services.organizationUsers.removeOrganizationUser(
            { organizationId, userId: ou.userId },
            tx
          )
        ),
        ...organizationRoles.map((or) =>
          this.services.organizationRoles.removeOrganizationRole(
            { organizationId, roleId: or.roleId },
            tx
          )
        ),
        ...organizationGroups.map((og) =>
          this.services.organizationGroups.removeOrganizationGroup(
            { organizationId, groupId: og.groupId },
            tx
          )
        ),
        ...organizationPermissions.map((op) =>
          this.services.organizationPermissions.removeOrganizationPermission(
            { organizationId, permissionId: op.permissionId },
            tx
          )
        ),
        ...organizationTags.map((ot) =>
          this.services.organizationTags.removeOrganizationTag(
            { organizationId, tagId: ot.tagId },
            tx
          )
        ),
      ]);

      return await this.services.organizations.deleteOrganization(params, tx);
    });
  }
}
