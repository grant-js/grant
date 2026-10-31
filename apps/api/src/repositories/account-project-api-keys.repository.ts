import type {
  AccountProjectApiKeyRow,
  AddAccountProjectApiKeyParams,
  IAccountProjectApiKeyRepository,
} from '@grantjs/core';
import { AccountProjectApiKeyModel, accountProjectApiKeys } from '@grantjs/database';
import { QueryAccountProjectApiKeysInput } from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class AccountProjectApiKeyRepository
  extends PivotRepository<AccountProjectApiKeyModel, AccountProjectApiKeyRow>
  implements IAccountProjectApiKeyRepository
{
  protected table = accountProjectApiKeys;
  protected uniqueIndexFields: Array<keyof AccountProjectApiKeyModel> = [
    'accountId',
    'projectId',
    'apiKeyId',
  ];

  protected toEntity(dbPivot: AccountProjectApiKeyModel): AccountProjectApiKeyRow {
    return dbPivot;
  }

  public async getAccountProjectApiKeys(
    params: QueryAccountProjectApiKeysInput,
    transaction?: Transaction
  ): Promise<AccountProjectApiKeyRow[]> {
    return this.query(params, transaction);
  }

  public async addAccountProjectApiKey(
    params: AddAccountProjectApiKeyParams,
    transaction?: Transaction
  ): Promise<AccountProjectApiKeyRow> {
    return this.add(params, transaction);
  }

  public async getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<AccountProjectApiKeyRow | null> {
    const rows = await this.getAccountProjectApiKeys(
      { apiKeyId, accountId, projectId },
      transaction
    );
    return rows[0] ?? null;
  }
}
