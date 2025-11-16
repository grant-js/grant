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
  RequestPasswordResetResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  SortOrder,
  UserAuthenticationMethodProvider,
  UserSessionSortableField,
  VerifyEmailResponse,
} from '@logusgraphics/grant-schema';

import { config } from '@/config';
import { ScopeHandler } from '@/handlers/base/scope-handler';
import { translateStatic, type SupportedLocale } from '@/i18n';
import { IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, ConflictError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { DeleteParams, SelectedFields } from '@/services/common';
import { Otp } from '@/services/user-authentication-methods.service';

export class AccountHandler extends ScopeHandler {
  private readonly logger = createModuleLogger('AccountHandler');

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
        throw new AuthenticationError('Invalid refresh token', 'errors:auth.invalidRefreshToken');
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
        throw new AuthenticationError(
          'User authentication method not found',
          'errors:auth.methodNotFound'
        );
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
          throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
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
        throw new AuthenticationError('User not verified', 'errors:auth.userNotVerified');
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
        throw new AuthenticationError('User not found', 'errors:auth.userNotFound');
      }

      const user = usersResult.users[0];

      if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
        throw new AuthenticationError('User does not have an account', 'errors:auth.noAccount');
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
            email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
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
        email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
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

  public async createComplementaryAccount(params: {
    name: string;
    username?: string | null;
  }): Promise<{ account: Account; accounts: Account[] }> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const result = await this.services.accounts.createComplementaryAccount(params, tx);
      return result;
    });
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
    audience: string,
    locale?: string
  ): Promise<CreateAccountResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { name, username, type, provider, providerId, providerData } = params;

      const existingAuthMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          provider,
          providerId,
          undefined,
          tx
        );

      if (existingAuthMethod) {
        throw new ConflictError(
          'An account with this email already exists',
          'errors:conflict.duplicateAuthMethod',
          { provider, providerId }
        );
      }

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
        const { token, validUntil } = processedProviderData.otp as Otp;
        if (token && validUntil > Date.now()) {
          try {
            await this.services.email.sendOtp({ to: providerId, token, validUntil, locale });
          } catch (error) {
            this.logger.error({
              msg: 'Error sending OTP',
              err: error,
            });
          }
        }
      }

      const result = {
        account,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        requiresEmailVerification: !isVerified,
        verificationExpiry: isVerified ? null : this.getVerificationExpiryDate(),
        email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
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

  public async verifyEmail(token: string, locale?: SupportedLocale): Promise<VerifyEmailResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      await this.services.userAuthenticationMethods.verifyEmail(token, tx);
      return {
        success: true,
        message: translateStatic('common:success.emailVerified', locale),
        messageKey: 'common:success.emailVerified',
      };
    });
  }

  public async resendVerificationEmail(
    email: string,
    locale?: SupportedLocale
  ): Promise<ResendVerificationResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { token, validUntil } =
        await this.services.userAuthenticationMethods.resendVerificationEmail(email, tx);

      try {
        await this.services.email.sendOtp({ to: email, token, validUntil, locale });
      } catch (error) {
        this.logger.error({
          msg: 'Error sending verification email',
          err: error,
        });
        throw new AuthenticationError(
          'Failed to send verification email',
          'errors:auth.emailSendFailed'
        );
      }

      return {
        success: true,
        message: translateStatic('common:success.verificationEmailSent', locale),
        messageKey: 'common:success.verificationEmailSent',
      };
    });
  }

  public async requestPasswordReset(
    email: string,
    locale?: SupportedLocale
  ): Promise<RequestPasswordResetResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const otp = await this.services.userAuthenticationMethods.requestPasswordReset(email, tx);

      if (!otp) {
        return {
          success: true,
          message: translateStatic('common:success.passwordResetEmailSent', locale),
          messageKey: 'common:success.passwordResetEmailSent',
        };
      }

      try {
        await this.services.email.sendPasswordReset({
          to: email,
          token: otp.token,
          validUntil: otp.validUntil,
          locale,
        });
      } catch (error) {
        this.logger.error({
          msg: 'Error sending password reset email',
          err: error,
        });
        throw new AuthenticationError(
          'Failed to send password reset email',
          'errors:auth.emailSendFailed'
        );
      }

      return {
        success: true,
        message: translateStatic('common:success.passwordResetEmailSent', locale),
        messageKey: 'common:success.passwordResetEmailSent',
      };
    });
  }

  public async resetPassword(
    token: string,
    newPassword: string,
    locale?: SupportedLocale
  ): Promise<ResetPasswordResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const userId = await this.services.userAuthenticationMethods.resetPassword(
        token,
        newPassword,
        tx
      );

      if (!userId) {
        throw new AuthenticationError('Invalid or expired token', 'errors:auth.invalidToken');
      }

      await this.services.userAuthenticationMethods.invalidateAllUserSessions(userId, tx);

      // Send password change confirmation email
      try {
        // TODO: Implement password change confirmation email
        // await this.services.email.sendPasswordChangeConfirmation({ to: email, locale });
      } catch (error) {
        this.logger.error({
          msg: 'Error sending password change confirmation email',
          err: error,
        });
        // Don't throw - password reset succeeded, confirmation email is optional
      }

      return {
        success: true,
        message: translateStatic('common:success.passwordReset', locale),
        messageKey: 'common:success.passwordReset',
      };
    });
  }
}
