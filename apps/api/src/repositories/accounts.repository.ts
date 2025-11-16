import { AccountModel, accountProjects, accounts } from '@logusgraphics/grant-database';
import {
  Account,
  AccountPage,
  AccountProject,
  AccountSearchableField,
  CreateAccountInput,
  MutationDeleteAccountArgs,
  MutationUpdateAccountArgs,
  QueryAccountsArgs,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { slugifySafe } from '@/lib/slugify.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/services/common';

import {
  BaseCreateArgs,
  BaseDeleteArgs,
  BaseUpdateArgs,
  EntityRepository,
  RelationsConfig,
} from './common/EntityRepository';

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

  public generateSlug(name: string): string {
    return slugifySafe(name);
  }

  public async findBySlug(slug: string, _transaction?: Transaction): Promise<Account | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.slug, slug), isNull(this.table.deletedAt)))
      .limit(1);

    return result.length > 0 ? (result[0] as Account) : null;
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
      slug: params.username || this.generateSlug(params.name),
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
        slug: params.input.slug,
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
