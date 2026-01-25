import { PermissionTagModel, permissionTags } from '@grantjs/database';
import {
  AddPermissionTagInput,
  PermissionTag,
  QueryPermissionTagsInput,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class PermissionTagRepository extends PivotRepository<PermissionTagModel, PermissionTag> {
  protected table = permissionTags;
  protected uniqueIndexFields: Array<keyof PermissionTagModel> = ['permissionId', 'tagId'];

  protected toEntity(dbPivot: PermissionTagModel): PermissionTag {
    return dbPivot;
  }

  public async getPermissionTags(
    params: QueryPermissionTagsInput,
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    return this.query(params, transaction);
  }

  public async getPermissionTag(
    params: QueryPermissionTagsInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const result = await this.getPermissionTags(params, transaction);
    return this.first(result);
  }

  public async getPermissionTagIntersection(
    permissionIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    return this.queryIntersection({ permissionId: permissionIds, tagId: tagIds }, transaction);
  }

  public async addPermissionTag(
    params: AddPermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    return this.add(params, transaction);
  }

  public async updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const { permissionId, tagId, isPrimary } = params;
    return this.update({ permissionId, tagId }, { isPrimary }, transaction);
  }

  public async softDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    return this.hardDelete(params, transaction);
  }
}
