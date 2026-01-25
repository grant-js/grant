import { OrganizationTagModel, organizationTags } from '@grantjs/database';
import {
  AddOrganizationTagInput,
  OrganizationTag,
  QueryOrganizationTagsInput,
  RemoveOrganizationTagInput,
  UpdateOrganizationTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class OrganizationTagRepository extends PivotRepository<
  OrganizationTagModel,
  OrganizationTag
> {
  protected table = organizationTags;
  protected uniqueIndexFields: Array<keyof OrganizationTagModel> = ['organizationId', 'tagId'];

  protected toEntity(dbPivot: OrganizationTagModel): OrganizationTag {
    return dbPivot;
  }

  public async getOrganizationTags(
    params: QueryOrganizationTagsInput,
    transaction?: Transaction
  ): Promise<OrganizationTag[]> {
    return this.query(params, transaction);
  }

  public async addOrganizationTag(
    params: AddOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    return this.add(params, transaction);
  }

  public async updateOrganizationTag(
    params: UpdateOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    const { organizationId, tagId, isPrimary } = params;
    return this.update({ organizationId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    return this.hardDelete(params, transaction);
  }
}
