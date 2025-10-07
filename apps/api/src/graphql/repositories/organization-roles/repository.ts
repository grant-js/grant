import { OrganizationRoleModel, organizationRoles } from '@logusgraphics/grant-database';
import {
  AddOrganizationRoleInput,
  OrganizationRole,
  RemoveOrganizationRoleInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

export class OrganizationRoleRepository extends PivotRepository<
  OrganizationRoleModel,
  OrganizationRole
> {
  protected table = organizationRoles;
  protected parentIdField: keyof OrganizationRoleModel = 'organizationId';
  protected relatedIdField: keyof OrganizationRoleModel = 'roleId';

  protected toEntity(dbPivot: OrganizationRoleModel): OrganizationRole {
    return {
      id: dbPivot.id,
      organizationId: dbPivot.organizationId,
      roleId: dbPivot.roleId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getOrganizationRoles(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationRole[]> {
    return this.query({ parentId: params.organizationId }, transaction);
  }

  public async addOrganizationRole(
    params: AddOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.add(
      {
        parentId: params.organizationId,
        relatedId: params.roleId,
      },
      transaction
    );
  }

  public async softDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.softDelete(
      {
        parentId: params.organizationId,
        relatedId: params.roleId,
      },
      transaction
    );
  }

  public async hardDeleteOrganizationRole(
    params: RemoveOrganizationRoleInput,
    transaction?: Transaction
  ): Promise<OrganizationRole> {
    return this.hardDelete(
      {
        parentId: params.organizationId,
        relatedId: params.roleId,
      },
      transaction
    );
  }
}
