import { SupportedLocale } from '@grantjs/constants';
import { DbSchema } from '@grantjs/database';
import {
  AuthorizationReason,
  AuthorizationResult,
  CreateAccountResult,
  IsAuthorizedInput,
  LoginResponse,
  MutationLoginArgs,
  MutationRefreshSessionArgs,
  RefreshSessionResponse,
  RegisterInput,
  RequestPasswordResetResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  Scope,
  SortOrder,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
  UserSessionSortableField,
  VerifyEmailResponse,
} from '@grantjs/schema';

import { config } from '@/config';
import { translateStatic } from '@/i18n/helpers';
import { IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, ConflictError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { verifySecret } from '@/lib/token.lib';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { getVerificationExpirationMs, getVerificationExpiryDate } from '@/lib/verification.lib';
import { Services } from '@/services';
import { Otp } from '@/services/user-authentication-methods.service';

import { CacheHandler } from './base/cache-handler';

export class AuthHandler extends CacheHandler {
  protected readonly logger = createModuleLogger('AuthHandler');

  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async register(
    params: RegisterInput,
    locale?: string,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<CreateAccountResult> {
    const { type, provider, providerId, providerData } = params;

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
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

      const {
        providerData: processedProviderData,
        isVerified,
        name,
      } = await this.services.userAuthenticationMethods.processProvider(provider, providerId, {
        ...providerData,
        action: UserAuthenticationEmailProviderAction.Register,
      });

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
        {
          type,
          ownerId: user.id,
        },
        tx
      );

      // Seed account roles (Personal Account Owner or Organization Account Owner based on account type)
      const seededRoles = await this.services.accountRoles.seedAccountRoles(account.id, tx);

      // Assign the seeded account owner role to the user
      const accountOwnerRole = seededRoles[0]; // Only one role is seeded per account
      if (accountOwnerRole) {
        await this.services.userRoles.addUserRole(
          { userId: user.id, roleId: accountOwnerRole.role.id },
          tx
        );
      }

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
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

      const authMethodCreatedAt = userAuthenticationMethod.createdAt
        ? new Date(userAuthenticationMethod.createdAt)
        : new Date();

      const result = {
        account,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        requiresEmailVerification: !isVerified,
        verificationExpiry: isVerified ? null : getVerificationExpiryDate(authMethodCreatedAt),
        email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
      };

      return result;
    });
  }

  public async login(
    params: MutationLoginArgs,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<LoginResponse> {
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
          !verifySecret(processedProviderData.password as string, storedHashedPassword)
        ) {
          throw new AuthenticationError('Invalid credentials', 'errors:auth.invalidCredentials');
        }
      }

      const verificationCreatedAt = userAuthenticationMethod.createdAt
        ? new Date(userAuthenticationMethod.createdAt)
        : null;
      const verificationExpirationMs = getVerificationExpirationMs();
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

      // Check for existing non-expired sessions (without requiring exact userAgent/ipAddress match)
      const userSessionsResult = await this.services.userSessions.getUserSessions(
        {
          userId: user.id,
          audience: config.app.url,
          expiresAtMin: new Date(),
          userAgent,
          ipAddress,
          limit: 1,
          sort: {
            field: UserSessionSortableField.LastUsedAt,
            order: SortOrder.Desc,
          },
        },
        tx
      );

      const matchingSession = userSessionsResult.userSessions[0];

      if (matchingSession) {
        await this.services.userSessions.refreshSessionLastUsed(matchingSession.id, tx);

        const { accessToken, refreshToken } =
          await this.services.userSessions.signSession(matchingSession);
        return {
          accessToken,
          refreshToken,
          accounts: user.accounts ?? [],
          requiresEmailVerification: !userAuthenticationMethod.isVerified,
          verificationExpiry: userAuthenticationMethod.isVerified
            ? null
            : verificationCreatedAt
              ? getVerificationExpiryDate(verificationCreatedAt)
              : null,
          email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
        };
      }

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
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
          : verificationCreatedAt
            ? getVerificationExpiryDate(verificationCreatedAt)
            : null,
        email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
      };
    });
  }

  public async refreshSession(
    params: MutationRefreshSessionArgs,
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<RefreshSessionResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const session = await this.services.userSessions.refreshSession(
        params.accessToken,
        params.refreshToken,
        tx,
        userAgent,
        ipAddress
      );

      if (!session) {
        throw new AuthenticationError('Invalid refresh token', 'errors:auth.invalidRefreshToken');
      }

      return session;
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

  /**
   * Check if the current user is authorized for a permission.
   *
   * @param input - The authorization input containing permission and context
   * @param scopeOverride - Optional scope override (only effective for session tokens)
   *
   * For session tokens: scopeOverride allows dynamic scope switching (e.g., user switches organization)
   * For API key tokens: scopeOverride is ignored, token scope is always used
   */
  public async isAuthorized(
    input: IsAuthorizedInput,
    scopeOverride?: Scope
  ): Promise<AuthorizationResult> {
    const { permission, context } = input;

    const auth = this.services.auth.getAuth();

    if (!auth) {
      return {
        authorized: false,
        reason: AuthorizationReason.InvalidAuthenticationState as AuthorizationReason,
      };
    }

    const { userId, scope: tokenScope, expiresAt } = auth;

    // Use scopeOverride if provided, otherwise fall back to token scope
    // Note: grant.isAuthorized() will enforce that only session tokens can use override
    const effectiveScope = scopeOverride ?? tokenScope;

    if (!effectiveScope) {
      return {
        authorized: false,
        reason: AuthorizationReason.InvalidScope as AuthorizationReason,
      };
    }

    const cacheKey = this.getAuthorizationCacheKey(userId, effectiveScope, permission, context);
    const cachedResult = await this.getAuthorizationResult<AuthorizationResult>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    // Pass scopeOverride to grant.isAuthorized() which will check token type
    const result = await this.services.auth.isAuthorized(input, userId, scopeOverride);

    if (result.authorized || result.reason !== AuthorizationReason.NotAuthenticated) {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const cacheTtl = Math.max(0, expiresAt - currentTimeSeconds);

      await this.setAuthorizationResult(cacheKey, result, cacheTtl);
    }

    return result;
  }

  public async linkGithubAuthToExistingUser(
    params: {
      userId: string;
      providerId: string;
      providerData: Record<string, unknown>;
    },
    userAgent?: string | null,
    ipAddress?: string | null
  ): Promise<LoginResponse> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { userId, providerId, providerData } = params;

      const { providerData: processedProviderData, isVerified } =
        await this.services.userAuthenticationMethods.processProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          providerData
        );

      const userAuthenticationMethod =
        await this.services.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId,
            provider: UserAuthenticationMethodProvider.Github,
            providerId,
            providerData: processedProviderData,
            isVerified,
          },
          tx
        );

      const usersResult = await this.services.users.getUsers(
        {
          ids: [userId],
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

      const session = await this.services.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
        },
        tx
      );

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accounts: user.accounts ?? [],
        requiresEmailVerification: false,
        verificationExpiry: null,
        email: null,
      };
    });
  }
}
