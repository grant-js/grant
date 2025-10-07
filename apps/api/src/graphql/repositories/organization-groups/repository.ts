import { OrganizationGroup, organizationGroups } from '@logusgraphics/grant-database';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '../common/PivotRepository';

export class OrganizationGroupRepository extends PivotRepository<
  OrganizationGroup,
  OrganizationGroup
> {
  protected table = organizationGroups;
  protected parentIdField: keyof OrganizationGroup = 'organizationId';
  protected relatedIdField: keyof OrganizationGroup = 'groupId';

  protected toEntity(dbOrganizationGroup: OrganizationGroup): OrganizationGroup {
    return dbOrganizationGroup;
  }

  public async getOrganizationGroups(
    params: {
      organizationId: string;
    },
    transaction?: Transaction
  ): Promise<OrganizationGroup[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.organizationId,
    };
    return this.query(baseParams, transaction);
  }

  public async addOrganizationGroup(
    organizationId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    const baseParams: BasePivotAddArgs = {
      parentId: organizationId,
      relatedId: groupId,
    };
    const organizationGroup = await this.add(baseParams, transaction);
    return organizationGroup;
  }

  public async softDeleteOrganizationGroup(
    organizationId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<OrganizationGroup | null> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: organizationId,
      relatedId: groupId,
    };
    const organizationGroup = await this.softDelete(baseParams, transaction);
    return organizationGroup;
  }

  public async hardDeleteOrganizationGroup(
    organizationId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<OrganizationGroup | null> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: organizationId,
      relatedId: groupId,
    };
    const organizationGroup = await this.hardDelete(baseParams, transaction);
    return organizationGroup;
  }
}
