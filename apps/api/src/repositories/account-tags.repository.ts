import { AccountTagModel, accountTags } from '@grantjs/database';
import {
  AccountTag,
  AddAccountTagInput,
  QueryAccountTagsInput,
  RemoveAccountTagInput,
  UpdateAccountTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IAccountTagRepository } from '@grantjs/core';

export class AccountTagsRepository
  extends PivotRepository<AccountTagModel, AccountTag>
  implements IAccountTagRepository
{
  protected table = accountTags;
  protected uniqueIndexFields: Array<keyof AccountTagModel> = ['accountId', 'tagId'];

  protected toEntity(dbPivot: AccountTagModel): AccountTag {
    return dbPivot;
  }

  public async getAccountTags(
    params: QueryAccountTagsInput,
    transaction?: Transaction
  ): Promise<AccountTag[]> {
    return this.query(params, transaction);
  }

  public async addAccountTag(
    params: AddAccountTagInput,
    transaction?: Transaction
  ): Promise<AccountTag> {
    return this.add(params, transaction);
  }

  public async updateAccountTag(
    params: UpdateAccountTagInput,
    transaction?: Transaction
  ): Promise<AccountTag> {
    const { accountId, tagId, isPrimary } = params;
    return this.update({ accountId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteAccountTag(
    params: RemoveAccountTagInput,
    transaction?: Transaction
  ): Promise<AccountTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteAccountTag(
    params: RemoveAccountTagInput,
    transaction?: Transaction
  ): Promise<AccountTag> {
    return this.hardDelete(params, transaction);
  }
}
