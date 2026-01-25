import { OrganizationGroupModel, organizationGroups } from '@grantjs/database';
import {
  AddOrganizationGroupInput,
  OrganizationGroup,
  QueryOrganizationGroupsInput,
  RemoveOrganizationGroupInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class OrganizationGroupRepository extends PivotRepository<
  OrganizationGroupModel,
  OrganizationGroup
> {
  protected table = organizationGroups;
  protected uniqueIndexFields: Array<keyof OrganizationGroupModel> = ['organizationId', 'groupId'];

  protected toEntity(dbOrganizationGroup: OrganizationGroupModel): OrganizationGroup {
    return dbOrganizationGroup;
  }

  public async getOrganizationGroups(
    params: QueryOrganizationGroupsInput,
    transaction?: Transaction
  ): Promise<OrganizationGroup[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationGroup(
    params: AddOrganizationGroupInput,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    return this.add(params, transaction);
  }

  public async softDeleteOrganizationGroup(
    params: RemoveOrganizationGroupInput,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationGroup(
    params: RemoveOrganizationGroupInput,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    return this.hardDelete(params, transaction);
  }
}
