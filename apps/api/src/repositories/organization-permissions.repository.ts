import { OrganizationPermissionModel, organizationPermissions } from '@grantjs/database';
import {
  AddOrganizationPermissionInput,
  OrganizationPermission,
  QueryOrganizationPermissionsInput,
  RemoveOrganizationPermissionInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

import type { IOrganizationPermissionRepository } from '@grantjs/core';

export class OrganizationPermissionRepository
  extends PivotRepository<OrganizationPermissionModel, OrganizationPermission>
  implements IOrganizationPermissionRepository
{
  protected table = organizationPermissions;
  protected uniqueIndexFields: Array<keyof OrganizationPermissionModel> = [
    'organizationId',
    'permissionId',
  ];

  protected toEntity(
    dbOrganizationPermission: OrganizationPermissionModel
  ): OrganizationPermission {
    return dbOrganizationPermission;
  }

  public async getOrganizationPermissions(
    params: QueryOrganizationPermissionsInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationPermission(
    params: AddOrganizationPermissionInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission> {
    return this.add(params, transaction);
  }

  public async softDeleteOrganizationPermission(
    params: RemoveOrganizationPermissionInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationPermission(
    params: RemoveOrganizationPermissionInput,
    transaction?: Transaction
  ): Promise<OrganizationPermission> {
    return this.hardDelete(params, transaction);
  }
}
