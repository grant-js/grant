import { EntityCache } from '@/graphql/controllers/base/ScopeController';
import { AuthenticationError } from '@/graphql/errors';
import {
  MutationDeleteAccountArgs,
  QueryAccountsArgs,
  AccountPage,
  Account,
  MutationUpdateAccountArgs,
  CreateAccountInput,
  UserAuthenticationMethodProvider,
  Tenant,
  AccountType,
  CreateAccountResult,
  MutationLoginArgs,
  LoginResponse,
  SortOrder,
  UserSessionSortableField,
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

  public async login(params: MutationLoginArgs): Promise<LoginResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { provider, providerId, providerData } = params.input;
      const { providerData: processedProviderData } =
        await this.services.userAuthenticationMethods.processProvider(
          provider,
          providerId,
          providerData
        );

      const userAuthenticationMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          provider,
          providerId,
          undefined,
          tx
        );

      if (!userAuthenticationMethod) {
        throw new AuthenticationError('User authentication method not found');
      }

      if (provider === UserAuthenticationMethodProvider.Email) {
        const userAuthenticationMethodProviderData =
          userAuthenticationMethod.providerData as unknown as { hashedPassword: string };
        const storedHashedPassword = userAuthenticationMethodProviderData.hashedPassword;
        if (
          !storedHashedPassword ||
          !this.services.userAuthenticationMethods.verifyPassword(
            processedProviderData.password as string,
            storedHashedPassword
          )
        ) {
          throw new AuthenticationError('Invalid credentials');
        }
      }

      // Only require isVerified if verification expiration (7 days) has passed
      const verificationCreatedAt = userAuthenticationMethod.createdAt
        ? new Date(userAuthenticationMethod.createdAt)
        : null;
      const verificationExpirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      const now = new Date();

      if (
        !userAuthenticationMethod.isVerified &&
        verificationCreatedAt &&
        now.getTime() - verificationCreatedAt.getTime() > verificationExpirationMs
      ) {
        throw new AuthenticationError('User not verified');
      }

      const usersResult = await this.services.users.getUsers(
        {
          ids: [userAuthenticationMethod.userId],
          limit: 1,
          requestedFields: ['accounts'],
        },
        tx
      );

      if (
        usersResult.totalCount === 0 ||
        !Array.isArray(usersResult.users) ||
        usersResult.users.length === 0
      ) {
        throw new AuthenticationError('User not found');
      }

      const user = usersResult.users[0];

      if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
        throw new AuthenticationError('User does not have an account');
      }

      const account = user.accounts[0]; // TODO: define how to select the account to use by default

      const userSessionsResult = await this.services.userSessions.getUserSessions(
        {
          userId: user.id,
          scopeTenant:
            account.type === AccountType.Organization ? Tenant.Organization : Tenant.Account,
          scopeId: account.id,
          limit: 1,
          sort: {
            field: UserSessionSortableField.LastUsedAt,
            order: SortOrder.Desc,
          },
        },
        tx
      );

      if (userSessionsResult.totalCount > 0) {
        const lastSession = userSessionsResult.userSessions[0];
        if (lastSession.expiresAt > new Date()) {
          const { accessToken, refreshToken } = this.services.userSessions.signSession(lastSession);
          return {
            accessToken,
            refreshToken,
            accounts: user.accounts ?? [],
            requiresEmailVerification: !userAuthenticationMethod.isVerified,
            verificationExpiry: userAuthenticationMethod.isVerified
              ? null
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          };
        }
      }

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          scopeTenant:
            account.type === AccountType.Organization ? Tenant.Organization : Tenant.Account,
          scopeId: account.id,
        },
        tx
      );

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accounts: user.accounts ?? [],
        requiresEmailVerification: !userAuthenticationMethod.isVerified,
        verificationExpiry: userAuthenticationMethod.isVerified
          ? null
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };
    });
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

  public async createAccount(
    params: Omit<CreateAccountInput, 'ownerId'>
  ): Promise<CreateAccountResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { name, type, provider, providerId, providerData } = params;

      const { providerData: processedProviderData, isVerified } =
        await this.services.userAuthenticationMethods.processProvider(
          provider,
          providerId,
          providerData as Record<string, unknown>
        );

      const user = await this.services.users.createUser({ name }, tx);

      const userAuthenticationMethod =
        await this.services.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId: user.id,
            provider,
            providerId,
            providerData: processedProviderData,
            isVerified,
          },
          tx
        );

      const account = await this.services.accounts.createAccount(
        { name, type, ownerId: user.id },
        tx
      );

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          scopeTenant: type === AccountType.Organization ? Tenant.Organization : Tenant.Account,
          scopeId: account.id,
        },
        tx
      );

      if (provider === UserAuthenticationMethodProvider.Email) {
        const { token } = processedProviderData.otp as { token: string };
        if (token) {
          try {
            await this.services.userAuthenticationMethods.sendOtp(providerId, token);
          } catch (error) {
            console.error('Error sending OTP', error);
          }
        }
      }

      const result = {
        account,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        requiresEmailVerification: !isVerified,
        verificationExpiry: isVerified ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      return result;
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
