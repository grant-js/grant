import { AccountModel, accountProjects, accounts, users } from '@grantjs/database';
import {
  Account,
  AccountPage,
  AccountProject,
  CreateAccountInput,
  QueryAccountsInput,
  User,
} from '@grantjs/schema';
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/services/common';

import {
  BaseCreateArgs,
  BaseDeleteArgs,
  EntityRepository,
  RelationsConfig,
} from './common/EntityRepository';

export class AccountRepository extends EntityRepository<AccountModel, Account> {
  protected table = accounts;
  protected schemaName = 'accounts' as const;
  protected searchFields: Array<keyof AccountModel> = [];
  protected defaultSortField: keyof AccountModel = 'createdAt';
  protected relations: RelationsConfig<Account> = {
    projects: {
      field: 'project',
      table: accountProjects,
      extract: (v: AccountProject[]) => v.map(({ project }) => project),
    },
    owner: {
      field: 'owner',
      table: users,
      extract: (v: User) => v, // owner is a single User object, not an array
    },
  };

  public async getAccounts(
    params: QueryAccountsInput & SelectedFields<Account>,
    transaction?: Transaction
  ): Promise<AccountPage> {
    const result = await this.query(params, transaction);
    return {
      accounts: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async getAccountsByOwnerId(
    ownerId: string,
    transaction?: Transaction,
    requestedFields?: Array<keyof Account>
  ): Promise<Account[]> {
    const result = await this.query(
      {
        filters: [{ field: 'ownerId', operator: 'eq', value: ownerId }],
        limit: -1,
        requestedFields,
      },
      transaction
    );
    return result.items;
  }

  public async getActiveAccountsByOwnerId(
    ownerId: string,
    transaction?: Transaction
  ): Promise<AccountModel[]> {
    const dbInstance = transaction ?? this.db;
    return await dbInstance
      .select()
      .from(this.table)
      .where(and(eq(this.table.ownerId, ownerId), isNull(this.table.deletedAt)));
  }

  public async getExpiredAccounts(
    retentionDate: Date,
    transaction?: Transaction
  ): Promise<Array<{ id: string; ownerId: string }>> {
    const dbInstance = transaction ?? this.db;

    const result = await dbInstance
      .select({ id: this.table.id, ownerId: this.table.ownerId })
      .from(this.table)
      .where(and(isNotNull(this.table.deletedAt), lt(this.table.deletedAt, retentionDate)));

    return result;
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseCreateArgs = {
      ownerId: params.ownerId,
      type: params.type,
    };

    return this.create(baseParams, transaction);
  }

  public async softDeleteAccount(accountId: string, transaction?: Transaction): Promise<Account> {
    const baseParams: BaseDeleteArgs = {
      id: accountId,
    };
    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteAccount(accountId: string, transaction?: Transaction): Promise<Account> {
    const baseParams: BaseDeleteArgs = {
      id: accountId,
    };
    return this.hardDelete(baseParams, transaction);
  }
}
