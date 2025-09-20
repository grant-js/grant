import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import {
  MutationDeleteAccountArgs,
  QueryAccountsArgs,
  AccountPage,
  Account,
  MutationUpdateAccountArgs,
  CreateAccountInput,
  UserAuthenticationMethodProvider,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction, TransactionManager } from '@/graphql/lib/transactions/TransactionManager';
import { Services } from '@/graphql/services';
import { DeleteParams, SelectedFields } from '@/graphql/services/common';

import { ScopeController } from '../base/ScopeController';

export class AccountController extends ScopeController {
  constructor(
    readonly scopeCache: EntityCache,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  public async getAccounts(
    params: QueryAccountsArgs & SelectedFields<Account>
  ): Promise<AccountPage> {
    const { page, limit, sort, search, ids, requestedFields } = params;

    const accountsResult = await this.services.accounts.getAccounts({
      ids,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return accountsResult;
  }

  public async createAccount(params: Omit<CreateAccountInput, 'ownerId'>): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { name, type, provider, providerId, providerData } = params;
      let parsedProviderData;

      try {
        parsedProviderData = JSON.parse(providerData);
      } catch {
        throw new Error('Invalid provider data');
      }

      switch (provider) {
        case UserAuthenticationMethodProvider.Email:
          const { password } = parsedProviderData;
          if (password) {
            const hashedPassword = this.services.userAuthenticationMethods.hashPassword(password);
            const otp = this.services.userAuthenticationMethods.generateOtp();
            parsedProviderData = {
              otp,
              hashedPassword,
            };
          }
          break;
        case UserAuthenticationMethodProvider.Google:
        case UserAuthenticationMethodProvider.Github:
          try {
            const { token } = parsedProviderData;
            const validatedProviderData =
              await this.services.userAuthenticationMethods.validateAuthProvider(
                provider,
                providerId,
                token
              );
            parsedProviderData = { ...validatedProviderData };
          } catch {
            throw new Error('Invalid token');
          }
          break;
      }

      const user = await this.services.users.createUser({ name }, tx);

      await this.services.userAuthenticationMethods.createUserAuthenticationMethod(
        {
          userId: user.id,
          provider,
          providerId,
          providerData: parsedProviderData,
        },
        tx
      );

      const account = await this.services.accounts.createAccount(
        { name, type, ownerId: user.id },
        tx
      );

      switch (provider) {
        case UserAuthenticationMethodProvider.Email:
          await this.services.userAuthenticationMethods.sendOtp(
            providerId,
            parsedProviderData?.otp?.token
          );
          break;
      }

      return account;
    });
  }

  public async updateAccount(params: MutationUpdateAccountArgs): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const updatedAccount = await this.services.accounts.updateAccount(params, tx);
      return updatedAccount;
    });
  }

  public async deleteAccount(params: MutationDeleteAccountArgs & DeleteParams): Promise<Account> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { id: accountId } = params;
      const [accountProjects] = await Promise.all([
        this.services.accountProjects.getAccountProjects({ accountId }, tx),
      ]);
      await Promise.all([
        ...accountProjects.map((ap) =>
          this.services.accountProjects.removeAccountProject(
            { accountId, projectId: ap.projectId },
            tx
          )
        ),
      ]);

      return await this.services.accounts.deleteAccount(params, tx);
    });
  }
}
