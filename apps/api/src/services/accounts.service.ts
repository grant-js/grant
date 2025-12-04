import { accountAuditLogs, accounts, DbSchema } from '@logusgraphics/grant-database';
import {
  Account,
  AccountPage,
  AccountType,
  CreateAccountInput,
  QueryAccountsArgs,
  User,
} from '@logusgraphics/grant-schema';
import { and, eq, isNull } from 'drizzle-orm';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  accountSchema,
  createAccountInputSchema,
  deleteAccountParamsSchema,
  getAccountsParamsSchema,
} from './accounts.schemas';
import {
  AuditService,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  validateInput,
  validateOutput,
} from './common';

export class AccountService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    readonly db: DbSchema
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
      throw new NotFoundError('Account not found', 'errors:notFound.account');
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

  public async getAccountsByOwnerId(
    ownerId: string,
    transaction?: Transaction
  ): Promise<Account[]> {
    return await this.repositories.accountRepository.getAccountsByOwnerId(ownerId, transaction);
  }

  public async getExpiredAccounts(
    retentionDate: Date,
    transaction?: Transaction
  ): Promise<Array<{ id: string; ownerId: string }>> {
    return await this.repositories.accountRepository.getExpiredAccounts(retentionDate, transaction);
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'provider' | 'providerId' | 'providerData'>,
    transaction?: Transaction
  ): Promise<Account> {
    const context = 'AccountService.createAccount';
    const validatedParams = validateInput(createAccountInputSchema, params, context);
    const { type, ownerId } = validatedParams;

    const createdAccount = await this.repositories.accountRepository.createAccount(
      {
        type,
        ownerId,
      },
      transaction
    );

    // Fetch the account with owner relationship loaded to satisfy GraphQL schema requirements
    const accountsResult = await this.repositories.accountRepository.getAccounts(
      {
        ids: [createdAccount.id],
        limit: 1,
        requestedFields: ['owner'],
      },
      transaction
    );

    const account = accountsResult.accounts[0];
    if (!account) {
      throw new NotFoundError('Account not found after creation', 'errors:notFound.account');
    }

    if (!account.owner) {
      throw new NotFoundError('Owner not loaded for account', 'errors:notFound.user');
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

    await this.logCreate(account.id, newValues, metadata, transaction);

    // Validate the account schema (which doesn't include relations like owner)
    // Then preserve the owner relation that was loaded
    const validatedAccount = validateOutput(
      createDynamicSingleSchema(accountSchema),
      account,
      context
    );

    // Preserve the owner relation after validation (validation strips it because it's not in the schema)
    if (account.owner) {
      (validatedAccount as Account & { owner: User }).owner = account.owner;
    }

    return validatedAccount;
  }

  public async createComplementaryAccount(
    transaction?: Transaction
  ): Promise<{ account: Account; accounts: Account[] }> {
    if (!this.user) {
      throw new BadRequestError(
        'User must be authenticated to create complementary account',
        'errors:auth.unauthorized'
      );
    }

    const userId = this.user.id;

    // Query user's existing accounts directly from database
    const dbInstance = transaction ?? this.db;

    const existingAccounts = await dbInstance
      .select()
      .from(accounts)
      .where(and(eq(accounts.ownerId, userId), isNull(accounts.deletedAt)));

    // Validate: Max 2 accounts per user
    if (existingAccounts.length >= 2) {
      throw new BadRequestError(
        'User has reached maximum account limit (2 accounts)',
        'errors:validation.maxAccountsReached'
      );
    }

    // Determine complementary account type
    const hasPersonal = existingAccounts.some((acc) => acc.type === AccountType.Personal);
    const hasOrganization = existingAccounts.some((acc) => acc.type === AccountType.Organization);

    let complementaryType: AccountType;
    if (hasPersonal && !hasOrganization) {
      complementaryType = AccountType.Organization;
    } else if (hasOrganization && !hasPersonal) {
      complementaryType = AccountType.Personal;
    } else {
      throw new BadRequestError(
        'User already has both account types',
        'errors:validation.complementaryAccountExists'
      );
    }

    // Create the complementary account
    const newAccount = await this.createAccount(
      {
        type: complementaryType,
        ownerId: userId,
      },
      transaction
    );

    // Fetch all accounts for the user after creation using repository to properly load owner relationship
    const allUserAccounts = await this.repositories.accountRepository.getAccountsByOwnerId(
      userId,
      transaction,
      ['owner']
    );

    return {
      account: newAccount,
      accounts: allUserAccounts,
    };
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

    const deletedAccount = isHardDelete
      ? await this.repositories.accountRepository.hardDeleteAccount(id, transaction)
      : await this.repositories.accountRepository.softDeleteAccount(id, transaction);

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
