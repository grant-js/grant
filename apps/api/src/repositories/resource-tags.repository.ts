import { ResourceTagModel, resourceTags } from '@grantjs/database';
import {
  AddResourceTagInput,
  QueryResourceTagsInput,
  RemoveResourceTagInput,
  ResourceTag,
  UpdateResourceTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IResourceTagRepository } from '@grantjs/core';

export class ResourceTagRepository
  extends PivotRepository<ResourceTagModel, ResourceTag>
  implements IResourceTagRepository
{
  protected table = resourceTags;
  protected uniqueIndexFields: Array<keyof ResourceTagModel> = ['resourceId', 'tagId'];

  protected toEntity(dbPivot: ResourceTagModel): ResourceTag {
    return dbPivot;
  }

  public async getResourceTags(
    params: QueryResourceTagsInput,
    transaction?: Transaction
  ): Promise<ResourceTag[]> {
    return this.query(params, transaction);
  }

  public async getResourceTag(
    params: QueryResourceTagsInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const result = await this.getResourceTags(params, transaction);
    return this.first(result);
  }

  public async getResourceTagIntersection(
    resourceIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<ResourceTag[]> {
    return this.queryIntersection({ resourceId: resourceIds, tagId: tagIds }, transaction);
  }

  public async addResourceTag(
    params: AddResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    return this.add(params, transaction);
  }

  public async updateResourceTag(
    params: UpdateResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    const { resourceId, tagId, isPrimary } = params;
    return this.update({ resourceId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteResourceTag(
    params: RemoveResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteResourceTag(
    params: RemoveResourceTagInput,
    transaction?: Transaction
  ): Promise<ResourceTag> {
    return this.hardDelete(params, transaction);
  }
}
