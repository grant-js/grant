import { RoleTagModel, roleTags } from '@grantjs/database';
import {
  AddRoleTagInput,
  QueryRoleTagsInput,
  RemoveRoleTagInput,
  RoleTag,
  UpdateRoleTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IRoleTagRepository } from '@grantjs/core';

export class RoleTagRepository
  extends PivotRepository<RoleTagModel, RoleTag>
  implements IRoleTagRepository
{
  protected table = roleTags;
  protected uniqueIndexFields: Array<keyof RoleTagModel> = ['roleId', 'tagId'];

  protected toEntity(dbPivot: RoleTagModel): RoleTag {
    return dbPivot;
  }

  public async getRoleTags(
    params: QueryRoleTagsInput,
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    return this.query(params, transaction);
  }

  public async getRoleTag(params: QueryRoleTagsInput, transaction?: Transaction): Promise<RoleTag> {
    const result = await this.getRoleTags(params, transaction);
    return this.first(result);
  }

  public async getRoleTagIntersection(
    roleIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    return this.queryIntersection({ roleId: roleIds, tagId: tagIds }, transaction);
  }

  public async addRoleTag(params: AddRoleTagInput, transaction?: Transaction): Promise<RoleTag> {
    return this.add(params, transaction);
  }

  public async updateRoleTag(
    params: UpdateRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const { roleId, tagId, isPrimary } = params;
    return this.update({ roleId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteRoleTag(
    params: RemoveRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteRoleTag(
    params: RemoveRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    return this.hardDelete(params, transaction);
  }
}
