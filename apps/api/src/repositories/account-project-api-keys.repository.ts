import { AccountProjectApiKeyModel, accountProjectApiKeys } from '@grantjs/database';
import {
  AccountProjectApiKey,
  AddAccountProjectApiKeyInput,
  QueryAccountProjectApiKeysInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

import type { IAccountProjectApiKeyRepository } from '@grantjs/core';

export class AccountProjectApiKeyRepository
  extends PivotRepository<AccountProjectApiKeyModel, AccountProjectApiKey>
  implements IAccountProjectApiKeyRepository
{
  protected table = accountProjectApiKeys;
  protected uniqueIndexFields: Array<keyof AccountProjectApiKeyModel> = [
    'accountId',
    'projectId',
    'apiKeyId',
  ];

  protected toEntity(dbPivot: AccountProjectApiKeyModel): AccountProjectApiKey {
    return dbPivot;
  }

  public async getAccountProjectApiKeys(
    params: QueryAccountProjectApiKeysInput,
    transaction?: Transaction
  ): Promise<AccountProjectApiKey[]> {
    return this.query(params, transaction);
  }

  public async addAccountProjectApiKey(
    params: AddAccountProjectApiKeyInput,
    transaction?: Transaction
  ): Promise<AccountProjectApiKey> {
    return this.add(params, transaction);
  }

  public async getByApiKeyAndAccountAndProject(
    apiKeyId: string,
    accountId: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<AccountProjectApiKey | null> {
    const rows = await this.getAccountProjectApiKeys(
      { apiKeyId, accountId, projectId },
      transaction
    );
    return rows[0] ?? null;
  }
}
