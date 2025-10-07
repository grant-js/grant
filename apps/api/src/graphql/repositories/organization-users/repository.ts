import { organizationUsers, OrganizationUserModel } from '@logusgraphics/grant-database';
import {
  AddOrganizationUserInput,
  OrganizationUser,
  RemoveOrganizationUserInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

export class OrganizationUserRepository extends PivotRepository<
  OrganizationUserModel,
  OrganizationUser
> {
  protected table = organizationUsers;
  protected parentIdField: keyof OrganizationUserModel = 'organizationId';
  protected relatedIdField: keyof OrganizationUserModel = 'userId';

  protected toEntity(dbOrganizationUser: OrganizationUserModel): OrganizationUser {
    return {
      id: dbOrganizationUser.id,
      organizationId: dbOrganizationUser.organizationId,
      userId: dbOrganizationUser.userId,
      createdAt: dbOrganizationUser.createdAt,
      updatedAt: dbOrganizationUser.updatedAt,
      deletedAt: dbOrganizationUser.deletedAt,
    };
  }

  public async getOrganizationUsers(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationUser[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.organizationId,
    };

    return this.query(baseParams, transaction);
  }

  public async addOrganizationUser(
    params: AddOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.add(baseParams, transaction);

    return organizationUser;
  }

  public async softDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.softDelete(baseParams, transaction);

    return organizationUser;
  }

  public async hardDeleteOrganizationUser(
    params: RemoveOrganizationUserInput,
    transaction?: Transaction
  ): Promise<OrganizationUser> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.organizationId,
      relatedId: params.userId,
    };

    const organizationUser = await this.hardDelete(baseParams, transaction);

    return organizationUser;
  }
}
