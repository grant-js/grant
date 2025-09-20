import {
  Account,
  QueryAccountsArgs,
  AccountPage,
  CreateAccountInput,
  MutationUpdateAccountArgs,
  MutationDeleteAccountArgs,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { accountAuditLogs } from '@/graphql/repositories/accounts';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from '../common';

import {
  accountSchema,
  createAccountInputSchema,
  deleteAccountParamsSchema,
  getAccountsParamsSchema,
  updateAccountParamsSchema,
} from './schemas';

export class AccountService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(accountAuditLogs, 'accountId', user, db);
  }

  private async getAccount(accountId: string, transaction?: Transaction): Promise<Account> {
    const existingAccounts = await this.repositories.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (existingAccounts.accounts.length === 0) {
      throw new Error('Account not found');
    }

    return existingAccounts.accounts[0];
  }

  public async getAccounts(
    params: QueryAccountsArgs & SelectedFields<Account>,
    transaction?: Transaction
  ): Promise<AccountPage> {
    const context = 'AccountService.getAccounts';
    validateInput(getAccountsParamsSchema, params, context);
    const result = await this.repositories.accountRepository.getAccounts(params, transaction);

    const transformedResult = {
      items: result.accounts,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(accountSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.createAccount';
    const validatedParams = validateInput(createAccountInputSchema, params, context);
    const { name, type, ownerId } = validatedParams;

    const account = await this.repositories.accountRepository.createAccount(
      {
        name,
        type,
        ownerId,
      },
      transaction
    );

    const newValues = {
      id: account.id,
      name: account.name,
      slug: account.slug,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(account.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountSchema), account, context);
  }

  public async updateAccount(
    params: MutationUpdateAccountArgs,
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.updateAccount';
    const validatedParams = validateInput(updateAccountParamsSchema, params, context);

    const { id, input } = validatedParams;

    const oldAccount = await this.getAccount(id);
    const updatedAccount = await this.repositories.accountRepository.updateAccount(
      { id, input },
      transaction
    );

    const oldValues = {
      id: oldAccount.id,
      name: oldAccount.name,
      slug: oldAccount.slug,
      type: oldAccount.type,
      createdAt: oldAccount.createdAt,
      updatedAt: oldAccount.updatedAt,
    };

    const newValues = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      slug: updatedAccount.slug,
      type: updatedAccount.type,
      createdAt: updatedAccount.createdAt,
      updatedAt: updatedAccount.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedAccount.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(accountSchema), updatedAccount, context);
  }

  public async deleteAccount(
    params: MutationDeleteAccountArgs & DeleteParams,
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.deleteAccount';
    const validatedParams = validateInput(deleteAccountParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldAccount = await this.getAccount(id, transaction);
    const isHardDelete = hardDelete === true;

    const deletedAccount = isHardDelete
      ? await this.repositories.accountRepository.hardDeleteAccount(validatedParams, transaction)
      : await this.repositories.accountRepository.softDeleteAccount(validatedParams, transaction);

    const oldValues = {
      id: oldAccount.id,
      name: oldAccount.name,
      slug: oldAccount.slug,
      type: oldAccount.type,
      createdAt: oldAccount.createdAt,
      updatedAt: oldAccount.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedAccount.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedAccount.deletedAt,
      };
      await this.logSoftDelete(deletedAccount.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(accountSchema), deletedAccount, context);
  }
}
