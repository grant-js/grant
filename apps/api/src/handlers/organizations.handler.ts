import { ORGANIZATION_ROLE_DEFINITIONS, RoleKey } from '@grantjs/constants';
import {
  MutationCreateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IOrganizationGroupService,
  IOrganizationPermissionService,
  IOrganizationProjectService,
  IOrganizationRoleService,
  IOrganizationService,
  IOrganizationTagService,
  IOrganizationUserService,
  ITransactionalConnection,
  IUserRoleService,
} from '@grantjs/core';

export class OrganizationHandler extends CacheHandler {
  constructor(
    private readonly organizations: IOrganizationService,
    private readonly organizationRoles: IOrganizationRoleService,
    private readonly organizationUsers: IOrganizationUserService,
    private readonly userRoles: IUserRoleService,
    private readonly organizationProjects: IOrganizationProjectService,
    private readonly organizationGroups: IOrganizationGroupService,
    private readonly organizationPermissions: IOrganizationPermissionService,
    private readonly organizationTags: IOrganizationTagService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>
  ): Promise<OrganizationPage> {
    const { page, limit, sort, search, ids, requestedFields } = params;

    const organizationsResult = await this.organizations.getOrganizations({
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
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { name } = input;

      const organization = await this.organizations.createOrganization({ name }, tx);

      const seededRoles = await this.organizationRoles.seedOrganizationRoles(organization.id, tx);

      await this.organizationUsers.addOrganizationUser(
        { organizationId: organization.id, userId },
        tx
      );

      const ownerRole = seededRoles.find(
        (r) => r.role.name === ORGANIZATION_ROLE_DEFINITIONS[RoleKey.OrganizationOwner].name
      );
      if (ownerRole) {
        const userRoles = await this.userRoles.getUserRoles({ userId }, tx);
        const hasOwnerRole = userRoles.some((ur) => ur.roleId === ownerRole.role.id);

        if (!hasOwnerRole) {
          await this.userRoles.addUserRole({ userId, roleId: ownerRole.role.id }, tx);
        }
      }

      return organization;
    });
  }

  public async updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const updatedOrganization = await this.organizations.updateOrganization(params, tx);
      return updatedOrganization;
    });
  }

  public async deleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'> & DeleteParams
  ): Promise<Organization> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { id: organizationId } = params;
      const [
        organizationProjects,
        organizationUsers,
        organizationRoles,
        organizationGroups,
        organizationPermissions,
        organizationTags,
      ] = await Promise.all([
        this.organizationProjects.getOrganizationProjects({ organizationId }, tx),
        this.organizationUsers.getOrganizationUsers({ organizationId }, tx),
        this.organizationRoles.getOrganizationRoles({ organizationId }, tx),
        this.organizationGroups.getOrganizationGroups({ organizationId }, tx),
        this.organizationPermissions.getOrganizationPermissions({ organizationId }, tx),
        this.organizationTags.getOrganizationTags({ organizationId }, tx),
      ]);
      await Promise.all([
        ...organizationProjects.map((op) =>
          this.organizationProjects.removeOrganizationProject(
            { organizationId, projectId: op.projectId },
            tx
          )
        ),
        ...organizationUsers.map((ou) =>
          this.organizationUsers.removeOrganizationUser({ organizationId, userId: ou.userId }, tx)
        ),
        ...organizationRoles.map((or) =>
          this.organizationRoles.removeOrganizationRole({ organizationId, roleId: or.roleId }, tx)
        ),
        ...organizationGroups.map((og) =>
          this.organizationGroups.removeOrganizationGroup(
            { organizationId, groupId: og.groupId },
            tx
          )
        ),
        ...organizationPermissions.map((op) =>
          this.organizationPermissions.removeOrganizationPermission(
            { organizationId, permissionId: op.permissionId },
            tx
          )
        ),
        ...organizationTags.map((ot) =>
          this.organizationTags.removeOrganizationTag({ organizationId, tagId: ot.tagId }, tx)
        ),
      ]);

      return await this.organizations.deleteOrganization(params, tx);
    });
  }
}
