import { eq, and, isNull } from 'drizzle-orm';

import {
  Account,
  AccountPage,
  AccountProject,
  AccountSearchableField,
  MutationCreateAccountArgs,
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
    params: MutationCreateAccountArgs,
    transaction?: Transaction
  ): Promise<Account> {
    const baseParams: BaseCreateArgs = {
      input: {
        name: params.input.name,
        slug: this.generateSlug(params.input.name),
        ownerId: params.input.ownerId,
        type: params.input.type,
      },
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

  async findBySlug(slug: string): Promise<AccountModel | null> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.slug, slug), isNull(accounts.deletedAt)))
      .limit(1);

    return result[0] || null;
  }

  async findByOwnerId(ownerId: string): Promise<AccountModel[]> {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.ownerId, ownerId), isNull(accounts.deletedAt)));
  }

  async findPersonalAccountByOwnerId(ownerId: string): Promise<AccountModel | null> {
    const result = await this.db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.ownerId, ownerId),
          eq(accounts.type, 'personal'),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  }
}
