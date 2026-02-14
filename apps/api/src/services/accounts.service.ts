import { GrantAuth } from '@grantjs/core';
import {
  Account,
  AccountPage,
  CreateAccountInput,
  QueryAccountsInput,
  User,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import {
  accountSchema,
  createAccountInputSchema,
  deleteAccountParamsSchema,
  queryAccountsInputSchema,
} from './accounts.schemas';
import {
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';

import type { IAuditLogger, IAccountRepository, IAccountService } from '@grantjs/core';

export class AccountService implements IAccountService {
  constructor(
    private readonly accountRepository: IAccountRepository,
    private readonly user: GrantAuth | null,
    private readonly audit: IAuditLogger
  ) {}

  private async getAccount(accountId: string, transaction?: Transaction): Promise<Account> {
    const existingAccounts = await this.accountRepository.getAccounts(
      {
        ids: [accountId],
        limit: 1,
      },
      transaction
    );

    if (existingAccounts.accounts.length === 0) {
      throw new NotFoundError('Account');
    }

    return existingAccounts.accounts[0];
  }

  public async getAccounts(
    params: QueryAccountsInput & SelectedFields<Account>,
    transaction?: Transaction
  ): Promise<AccountPage> {
    const context = 'AccountService.getAccounts';

    validateInput(queryAccountsInputSchema, params, context);

    const result = await this.accountRepository.getAccounts(params, transaction);

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

  public async getOwnerAccounts(transaction?: Transaction): Promise<Account[]> {
    const ownerId = this.user?.userId;
    if (!ownerId) {
      throw new BadRequestError('User must be authenticated to get accounts by owner ID');
    }
    return await this.getAccountsByOwnerId(ownerId, transaction);
  }

  public async getAccountsByOwnerId(
    ownerId: string,
    transaction?: Transaction
  ): Promise<Account[]> {
    return await this.accountRepository.getAccountsByOwnerId(ownerId, transaction);
  }

  public async getExpiredAccounts(
    retentionDate: Date,
    transaction?: Transaction
  ): Promise<Array<{ id: string; ownerId: string }>> {
    return await this.accountRepository.getExpiredAccounts(retentionDate, transaction);
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.createAccount';
    const validatedParams = validateInput(createAccountInputSchema, params, context);
    const { type, ownerId } = validatedParams;

    const createdAccount = await this.accountRepository.createAccount(
      {
        type,
        ownerId,
      },
      transaction
    );

    const accountsResult = await this.accountRepository.getAccounts(
      {
        ids: [createdAccount.id],
        limit: 1,
        requestedFields: ['owner'],
      },
      transaction
    );

    const account = accountsResult.accounts[0];
    if (!account) {
      throw new NotFoundError('Account');
    }

    if (!account.owner) {
      throw new NotFoundError('User');
    }

    const newValues = {
      id: account.id,
      type: account.type,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(account.id, newValues, metadata, transaction);

    const validatedAccount = validateOutput(
      createDynamicSingleSchema(accountSchema),
      account,
      context
    );

    if (account.owner) {
      (validatedAccount as Account & { owner: User }).owner = account.owner;
    }

    return validatedAccount;
  }

  public async deleteAccount(
    params: { id: string; hardDelete?: boolean },
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.deleteAccount';
    const validatedParams = validateInput(deleteAccountParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldAccount = await this.getAccount(id, transaction);
    const isHardDelete = hardDelete === true;

    const oldValues = {
      id: oldAccount.id,
      type: oldAccount.type,
      ownerId: oldAccount.ownerId,
      createdAt: oldAccount.createdAt,
      updatedAt: oldAccount.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    // For hard deletes, write the audit log BEFORE the entity is removed so the
    // FK (account_audit_logs.account_id → accounts.id) is still valid.  The
    // subsequent DELETE will trigger ON DELETE SET NULL on the audit row, but the
    // old data is preserved in the oldValues JSON column.
    if (isHardDelete) {
      await this.audit.logHardDelete(oldAccount.id, oldValues, metadata, transaction);
    }

    const deletedAccount = isHardDelete
      ? await this.accountRepository.hardDeleteAccount(id, transaction)
      : await this.accountRepository.softDeleteAccount(id, transaction);

    if (!isHardDelete) {
      const newValues = {
        ...oldValues,
        deletedAt: deletedAccount.deletedAt,
      };
      await this.audit.logSoftDelete(
        deletedAccount.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(accountSchema), deletedAccount, context);
  }
}
