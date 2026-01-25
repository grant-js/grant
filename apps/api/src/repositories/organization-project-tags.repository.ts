import {
  OrganizationProjectTagModel,
  organizationProjectTags,
} from '@grantjs/database/src/schemas/organization-project-tags.schema';
import {
  AddOrganizationProjectTagInput,
  OrganizationProjectTag,
  QueryOrganizationProjectTagInput,
  RemoveOrganizationProjectTagInput,
  UpdateOrganizationProjectTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class OrganizationProjectTagRepository extends PivotRepository<
  OrganizationProjectTagModel,
  OrganizationProjectTag
> {
  protected table = organizationProjectTags;
  protected uniqueIndexFields: Array<keyof OrganizationProjectTagModel> = [
    'organizationId',
    'projectId',
    'tagId',
  ];

  protected toEntity(dbPivot: OrganizationProjectTagModel): OrganizationProjectTag {
    return dbPivot;
  }

  public async getOrganizationProjectTags(
    params: QueryOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag[]> {
    return this.query(params, transaction);
  }

  public async getOrganizationProjectTagIntersection(
    organizationId: string,
    projectIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<OrganizationProjectTag[]> {
    return this.queryIntersection(
      { organizationId: [organizationId], projectId: projectIds, tagId: tagIds },
      transaction
    );
  }

  public async getOrganizationProjectTag(
    params: QueryOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    const result = await this.getOrganizationProjectTags(params, transaction);
    return this.first(result);
  }

  public async addOrganizationProjectTag(
    params: AddOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    return this.add(params, transaction);
  }

  public async updateOrganizationProjectTag(
    params: UpdateOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    const { organizationId, projectId, tagId, isPrimary } = params;
    return this.update({ organizationId, projectId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    return this.hardDelete(params, transaction);
  }
}
