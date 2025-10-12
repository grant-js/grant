import { DbSchema } from '@logusgraphics/grant-database';
import {
  Account,
  AccountPage,
  CreateAccountInput,
  CreateAccountResult,
  LoginResponse,
  MutationDeleteAccountArgs,
  MutationLoginArgs,
  MutationRefreshSessionArgs,
  MutationUpdateAccountArgs,
  QueryAccountsArgs,
  RefreshSessionResponse,
  SortOrder,
  UserAuthenticationMethodProvider,
  UserSessionSortableField,
} from '@logusgraphics/grant-schema';

import { config } from '@/config';
import { AuthenticationError } from '@/graphql/errors';
import { ScopeHandler } from '@/handlers/base/scope-handler';
import { IEntityCacheAdapter } from '@/lib/cache';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';

export class AccountHandler extends ScopeHandler {
  constructor(
    readonly scopeCache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(scopeCache, services);
  }

  private getVerificationExpirationMs(): number {
    return config.auth.providerVerificationExpirationDays * 24 * 60 * 60 * 1000;
  }

  private getVerificationExpiryDate(): Date {
    return new Date(Date.now() + this.getVerificationExpirationMs());
  }

  public async refreshSession(params: MutationRefreshSessionArgs): Promise<RefreshSessionResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const session = await this.services.userSessions.refreshSession(
        params.accessToken,
        params.refreshToken,
        tx
      );

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      return session;
    });
  }

  public async login(params: MutationLoginArgs, audience: string): Promise<LoginResponse> {
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

      const verificationCreatedAt = userAuthenticationMethod.createdAt
        ? new Date(userAuthenticationMethod.createdAt)
        : null;
      const verificationExpirationMs = this.getVerificationExpirationMs();
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

      const userSessionsResult = await this.services.userSessions.getUserSessions(
        {
          userId: user.id,
          audience,
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
          await this.services.userSessions.refreshSessionLastUsed(lastSession.id, tx);

          const { accessToken, refreshToken } = this.services.userSessions.signSession(lastSession);
          return {
            accessToken,
            refreshToken,
            accounts: user.accounts ?? [],
            requiresEmailVerification: !userAuthenticationMethod.isVerified,
            verificationExpiry: userAuthenticationMethod.isVerified
              ? null
              : this.getVerificationExpiryDate(),
          };
        }
      }

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          audience,
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
          : this.getVerificationExpiryDate(),
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

  public async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
    const isAvailable = await this.services.accounts.checkUsernameAvailability(username);

    return {
      available: isAvailable,
      username,
    };
  }

  public async createAccount(
    params: Omit<CreateAccountInput, 'ownerId'>,
    audience: string
  ): Promise<CreateAccountResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { name, username, type, provider, providerId, providerData } = params;

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
        { name, username, type, ownerId: user.id },
        tx
      );

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          audience,
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
        verificationExpiry: isVerified ? null : this.getVerificationExpiryDate(),
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
