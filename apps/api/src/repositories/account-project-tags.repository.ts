import {
  AccountProjectTagModel,
  accountProjectTags,
} from '@grantjs/database/src/schemas/account-project-tags.schema';
import {
  AccountProjectTag,
  AddAccountProjectTagInput,
  QueryAccountProjectTagInput,
  RemoveAccountProjectTagInput,
  UpdateAccountProjectTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IAccountProjectTagRepository } from '@grantjs/core';

export class AccountProjectTagRepository
  extends PivotRepository<AccountProjectTagModel, AccountProjectTag>
  implements IAccountProjectTagRepository
{
  protected table = accountProjectTags;
  protected uniqueIndexFields: Array<keyof AccountProjectTagModel> = [
    'accountId',
    'projectId',
    'tagId',
  ];

  protected toEntity(dbPivot: AccountProjectTagModel): AccountProjectTag {
    return dbPivot;
  }

  public async getAccountProjectTags(
    params: QueryAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag[]> {
    return this.query(params, transaction);
  }

  public async getAccountProjectTagIntersection(
    accountId: string,
    projectIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<AccountProjectTag[]> {
    return this.queryIntersection(
      { accountId: [accountId], projectId: projectIds, tagId: tagIds },
      transaction
    );
  }

  public async getAccountProjectTag(
    params: QueryAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    const result = await this.getAccountProjectTags(params, transaction);
    return this.first(result);
  }

  public async addAccountProjectTag(
    params: AddAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    return this.add(params, transaction);
  }

  public async updateAccountProjectTag(
    params: UpdateAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    const { accountId, projectId, tagId, isPrimary } = params;
    return this.update({ accountId, projectId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteAccountProjectTag(
    params: RemoveAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteAccountProjectTag(
    params: RemoveAccountProjectTagInput,
    transaction?: Transaction
  ): Promise<AccountProjectTag> {
    return this.hardDelete(params, transaction);
  }
}
