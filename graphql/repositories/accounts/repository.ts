import {
  Account,
  AccountPage,
  AccountProject,
  AccountSearchableField,
  CreateAccountInput,
  MutationDeleteAccountArgs,
  MutationUpdateAccountArgs,
  QueryAccountsArgs,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { SelectedFields } from '@/graphql/services/common';
import { slugifySafe } from '@/lib/slugify';

import { accountProjects } from '../account-projects';
import {
  BaseCreateArgs,
  BaseDeleteArgs,
  BaseUpdateArgs,
  EntityRepository,
  RelationsConfig,
} from '../common/EntityRepository';

import { accounts, AccountModel } from './schema';

export class AccountRepository extends EntityRepository<AccountModel, Account> {
  protected table = accounts;
  protected schemaName = 'accounts' as const;
  protected searchFields: Array<keyof AccountModel> = Object.values(AccountSearchableField);
  protected defaultSortField: keyof AccountModel = 'createdAt';
  protected relations: RelationsConfig<Account> = {
    projects: {
      field: 'project',
      table: accountProjects,
      extract: (v: AccountProject[]) => v.map(({ project }) => project),
    },
  };

  private generateSlug(name: string): string {
    return slugifySafe(name);
  }

  public async getAccounts(
    params: QueryAccountsArgs & SelectedFields<Account>,
    transaction?: Transaction
  ): Promise<AccountPage> {
    const result = await this.query(params, transaction);
    return {
      accounts: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseCreateArgs = {
      name: params.name,
      slug: this.generateSlug(params.name),
      ownerId: params.ownerId,
      type: params.type,
    };
    return this.create(baseParams, transaction);
  }

  public async updateAccount(
    params: MutationUpdateAccountArgs,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        slug: params.input.name ? this.generateSlug(params.input.name) : undefined,
        type: params.input.type,
      },
    };
    return this.update(baseParams, transaction);
  }

  public async softDeleteAccount(
    params: MutationDeleteAccountArgs,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };
    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteAccount(
    params: MutationDeleteAccountArgs,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };
    return this.hardDelete(baseParams, transaction);
  }
}
