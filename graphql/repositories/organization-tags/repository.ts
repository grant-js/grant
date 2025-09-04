import {
  OrganizationTag,
  AddOrganizationTagInput,
  RemoveOrganizationTagInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { OrganizationTagModel, organizationTags } from './schema';

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
    return this.add(
      {
        parentId: params.organizationId,
        relatedId: params.tagId,
      },
      transaction
    );
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
