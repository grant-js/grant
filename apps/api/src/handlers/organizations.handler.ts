import { DbSchema } from '@logusgraphics/grant-database';
import {
  MutationCreateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@logusgraphics/grant-schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

import { ScopeHandler } from './base/scope-handler';

export class OrganizationHandler extends ScopeHandler {
  constructor(
    readonly scopeCache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getOrganizations(
    params: QueryOrganizationsArgs & SelectedFields<Organization>
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

  public async createOrganization(
    params: MutationCreateOrganizationArgs,
    userId: string
  ): Promise<Organization> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { name } = input;

      // 1. Create organization
      const organization = await this.services.organizations.createOrganization({ name }, tx);

      // 2. Seed standard roles (owner, admin, dev, viewer)
      const seededRoles = await this.services.organizationRoles.seedOrganizationRoles(
        organization.id,
        tx
      );

      // 3. Add current user to organization_users
      await this.services.organizationUsers.addOrganizationUser(
        { organizationId: organization.id, userId },
        tx
      );

      // 4. Assign owner role to current user
      const ownerRole = seededRoles.find((r) => r.role.name === 'owner');
      if (ownerRole) {
        await this.services.userRoles.addUserRole({ userId, roleId: ownerRole.role.id }, tx);
      }

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
