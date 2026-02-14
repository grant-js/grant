import { OrganizationRoleModel, organizationRoles } from '@grantjs/database';
import {
  AddOrganizationRoleInput,
  OrganizationRole,
  QueryOrganizationRolesInput,
  RemoveOrganizationRoleInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IOrganizationRoleRepository } from '@grantjs/core';

export class OrganizationRoleRepository
  extends PivotRepository<OrganizationRoleModel, OrganizationRole>
  implements IOrganizationRoleRepository
{
  protected table = organizationRoles;
  protected uniqueIndexFields: Array<keyof OrganizationRoleModel> = ['organizationId', 'roleId'];

  protected toEntity(dbPivot: OrganizationRoleModel): OrganizationRole {
    return dbPivot;
  }

  public async getOrganizationRoles(
    params: QueryOrganizationRolesInput,
    transaction?: Transaction
  ): Promise<OrganizationRole[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationRole(
    params: AddOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.add(params, transaction);
  }

  public async softDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.hardDelete(params, transaction);
  }
}
