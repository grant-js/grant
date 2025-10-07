import { OrganizationTagModel, organizationTags } from '@logusgraphics/grant-database';
import {
  OrganizationTag,
  AddOrganizationTagInput,
  RemoveOrganizationTagInput,
  UpdateOrganizationTagInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

export class OrganizationTagRepository extends PivotRepository<
  OrganizationTagModel,
  OrganizationTag
> {
  protected table = organizationTags;
  protected parentIdField: keyof OrganizationTagModel = 'organizationId';
  protected relatedIdField: keyof OrganizationTagModel = 'tagId';

  protected toEntity(dbPivot: OrganizationTagModel): OrganizationTag {
    return {
      id: dbPivot.id,
      organizationId: dbPivot.organizationId,
      tagId: dbPivot.tagId,
      isPrimary: dbPivot.isPrimary,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getOrganizationTags(
    params: { organizationId: string },
    transaction?: Transaction
  ): Promise<OrganizationTag[]> {
    return this.query({ parentId: params.organizationId }, transaction);
  }

  public async addOrganizationTag(
    params: AddOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    const { organizationId, tagId, isPrimary } = params;
    return this.add({ parentId: organizationId, relatedId: tagId, isPrimary }, transaction);
  }

  public async updateOrganizationTag(
    params: UpdateOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    const { organizationId, tagId, isPrimary } = params;
    return this.update(organizationId, tagId, { isPrimary }, transaction);
  }

  public async softDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    return this.softDelete(
      {
        parentId: params.organizationId,
        relatedId: params.tagId,
      },
      transaction
    );
  }

  public async hardDeleteOrganizationTag(
    params: RemoveOrganizationTagInput,
    transaction?: Transaction
  ): Promise<OrganizationTag> {
    return this.hardDelete(
      {
        parentId: params.organizationId,
        relatedId: params.tagId,
      },
      transaction
    );
  }
}
