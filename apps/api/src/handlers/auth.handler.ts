import type {
  IAccountRoleService,
  IAccountService,
  IAuthService,
  IEmailService,
  ILogger,
  IOrganizationInvitationService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  IUserMfaService,
  IUserRoleService,
  IUserService,
  IUserSessionService,
} from '@grantjs/core';
import { SupportedLocale } from '@grantjs/i18n';
import {
  AccountType,
  AuthorizationReason,
  AuthorizationResult,
  CreateAccountResult,
  EmailVerificationProofInput,
  EmailVerificationProofType,
  IsAuthorizedInput,
  LoginResponse,
  MutationLoginArgs,
  OrganizationInvitationStatus,
  RefreshSessionResponse,
  RegisterInput,
  RequestPasswordResetResponse,
  ResendVerificationResponse,
  ResetPasswordResponse,
  Scope,
  SortOrder,
  Tenant,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
  UserSessionSortableField,
  VerifyEmailResponse,
} from '@grantjs/schema';

import { config } from '@/config';
import { translateStatic } from '@/i18n/helpers';
import { IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, BadRequestError, ConflictError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { verifySecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { getVerificationExpirationMs, getVerificationExpiryDate } from '@/lib/verification.lib';
import { Otp } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

export class AuthHandler extends CacheHandler {
  protected readonly logger = createLogger('AuthHandler');

  /** UX hint when platform requires AAL2 at login but the session is still AAL1 (MFA enrolled). */
  private async computeRequiresMfaStepUp(
    userId: string,
    mfaVerified: boolean,
    tx: Transaction
  ): Promise<boolean> {
    if (config.auth.minAalAtLogin !== 'aal2') {
      return false;
    }
    if (mfaVerified) {
      return false;
    }
    return this.userMfa.hasActiveMfaEnrollment(userId, tx);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private removeEmailOtp(providerData: Record<string, unknown>): Record<string, unknown> {
    const updatedProviderData = { ...providerData };
    delete updatedProviderData.otp;
    return updatedProviderData;
  }

  private async validatesInvitationEmailProof(
    provider: UserAuthenticationMethodProvider,
    providerId: string,
    proof: EmailVerificationProofInput | null | undefined,
    tx: Transaction
  ): Promise<boolean> {
    if (!proof) {
      return false;
    }

    if (provider !== UserAuthenticationMethodProvider.Email) {
      throw new BadRequestError(
        'Email verification proof is only supported for email authentication'
      );
    }

    if (proof.type !== EmailVerificationProofType.OrganizationInvitation) {
      throw new BadRequestError('Unsupported email verification proof');
    }

    const invitation = await this.organizationInvitations.getInvitationByToken(
      {
        token: proof.token,
        requestedFields: [],
      },
      tx
    );

    if (!invitation || invitation.status !== OrganizationInvitationStatus.Pending) {
      throw new BadRequestError('Invalid or expired invitation proof');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestError('Invalid or expired invitation proof');
    }

    if (this.normalizeEmail(invitation.email) !== this.normalizeEmail(providerId)) {
      throw new BadRequestError('Invitation proof does not match email address');
    }

    const proofTokenHash = (
      invitation as typeof invitation & { emailVerificationProofTokenHash?: string | null }
    ).emailVerificationProofTokenHash;

    if (
      !proof.emailProofToken ||
      !proofTokenHash ||
      !verifySecret(proof.emailProofToken, proofTokenHash)
    ) {
      throw new BadRequestError('Invalid or expired invitation proof');
    }

    return true;
  }

  constructor(
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    private readonly users: IUserService,
    private readonly accounts: IAccountService,
    private readonly accountRoles: IAccountRoleService,
    private readonly userRoles: IUserRoleService,
    private readonly userMfa: IUserMfaService,
    private readonly userSessions: IUserSessionService,
    private readonly email: IEmailService,
    private readonly auth: IAuthService,
    private readonly organizationInvitations: IOrganizationInvitationService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async register(
    params: RegisterInput,
    locale?: string,
    userAgent?: string | null,
    ipAddress?: string | null,
    requestLogger?: ILogger,
    requestBaseUrl?: string
  ): Promise<CreateAccountResult> {
    const { type, provider, providerId, providerData, emailVerificationProof } = params;

    return await this.db.withTransaction(async (tx: Transaction) => {
      const existingAuthMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          provider,
          providerId,
          undefined,
          tx
        );

      if (existingAuthMethod) {
        throw new ConflictError('An account with this email already exists');
      }

      const isVerifiedByInvitationProof = await this.validatesInvitationEmailProof(
        provider,
        providerId,
        emailVerificationProof,
        tx
      );

      const {
        providerData: processedProviderData,
        isVerified,
        name,
      } = await this.userAuthenticationMethods.processProvider(provider, providerId, {
        ...providerData,
        action: UserAuthenticationEmailProviderAction.Register,
      });

      const finalIsVerified = isVerified || isVerifiedByInvitationProof;
      const finalProviderData = isVerifiedByInvitationProof
        ? this.removeEmailOtp(processedProviderData)
        : processedProviderData;

      const user = await this.users.createUser({ name }, tx);

      const userAuthenticationMethod =
        await this.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId: user.id,
            provider,
            providerId,
            providerData: finalProviderData,
            isVerified: finalIsVerified,
          },
          tx
        );

      const account = await this.accounts.createAccount(
        {
          type,
          ownerId: user.id,
        },
        tx
      );

      // Seed account roles (Personal Account Owner or Organization Account Owner based on account type)
      const seededRoles = await this.accountRoles.seedAccountRoles(account.id, tx);

      // Assign the seeded account owner role to the user
      const accountOwnerRole = seededRoles[0]; // Only one role is seeded per account
      if (accountOwnerRole) {
        await this.userRoles.addUserRole({ userId: user.id, roleId: accountOwnerRole.role.id }, tx);
      }

      const session = await this.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          isVerified: finalIsVerified,
        },
        tx,
        requestBaseUrl
      );

      if (provider === UserAuthenticationMethodProvider.Email && !finalIsVerified) {
        const { token, validUntil } = processedProviderData.otp as Otp;
        if (token && validUntil > Date.now()) {
          try {
            await this.email.sendOtp({ to: providerId, token, validUntil, locale });
          } catch (error) {
            (requestLogger ?? this.logger).error({
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
        requiresEmailVerification: !finalIsVerified,
        verificationExpiry: finalIsVerified ? null : getVerificationExpiryDate(authMethodCreatedAt),
        email: provider === UserAuthenticationMethodProvider.Email ? providerId : null,
      };

      return result;
    });
  }

  public async login(
    params: MutationLoginArgs,
    userAgent?: string | null,
    ipAddress?: string | null,
    requestBaseUrl?: string
  ): Promise<LoginResponse> {
    const issuerBaseUrl = requestBaseUrl ?? config.app.url;
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { provider, providerId, providerData, emailVerificationProof } = params.input;
      const { providerData: processedProviderData } =
        await this.userAuthenticationMethods.processProvider(provider, providerId, providerData);

      let userAuthenticationMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
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
          !verifySecret(processedProviderData.password as string, storedHashedPassword)
        ) {
          throw new AuthenticationError('Invalid credentials');
        }
      }

      const isVerifiedByInvitationProof = await this.validatesInvitationEmailProof(
        provider,
        providerId,
        emailVerificationProof,
        tx
      );

      if (!userAuthenticationMethod.isVerified && isVerifiedByInvitationProof) {
        userAuthenticationMethod =
          await this.userAuthenticationMethods.updateUserAuthenticationMethod(
            userAuthenticationMethod.id,
            {
              isVerified: true,
              providerData: this.removeEmailOtp(
                (userAuthenticationMethod.providerData as Record<string, unknown>) || {}
              ),
            },
            tx
          );
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
        throw new AuthenticationError('User not verified');
      }

      const usersResult = await this.users.getUsers(
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

      let user = usersResult.users[0];

      if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
        // User has auth method but no account (e.g. created via project OAuth). Create default Personal account on first platform login.
        const account = await this.accounts.createAccount(
          { type: AccountType.Personal, ownerId: user.id },
          tx
        );
        const seededRoles = await this.accountRoles.seedAccountRoles(account.id, tx);
        const accountOwnerRole = seededRoles[0];
        if (accountOwnerRole) {
          await this.userRoles.addUserRole(
            { userId: user.id, roleId: accountOwnerRole.role.id },
            tx
          );
        }
        const usersResultAfter = await this.users.getUsers(
          { ids: [user.id], limit: 1, requestedFields: ['accounts'] },
          tx
        );
        user = usersResultAfter.users?.[0] ?? user;
      }

      // Check for existing non-expired sessions (without requiring exact userAgent/ipAddress match)
      const userSessionsResult = await this.userSessions.getUserSessions(
        {
          userId: user.id,
          audience: issuerBaseUrl,
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
        await this.userSessions.refreshSessionLastUsed(matchingSession.id, tx);

        const mfaVerifiedSession = Boolean(
          (matchingSession as unknown as { mfaVerifiedAt?: Date | null }).mfaVerifiedAt
        );
        const { accessToken, refreshToken } = await this.userSessions.signSession(
          matchingSession,
          userAuthenticationMethod.isVerified,
          mfaVerifiedSession,
          requestBaseUrl
        );
        const requiresMfaStepUp = await this.computeRequiresMfaStepUp(
          user.id,
          mfaVerifiedSession,
          tx
        );
        return {
          accessToken,
          refreshToken,
          mfaVerified: mfaVerifiedSession,
          requiresMfaStepUp,
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

      const session = await this.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          isVerified: userAuthenticationMethod.isVerified,
        },
        tx,
        requestBaseUrl
      );

      const requiresMfaStepUp = await this.computeRequiresMfaStepUp(user.id, false, tx);

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        mfaVerified: false,
        requiresMfaStepUp,
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
    refreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null,
    requestBaseUrl?: string
  ): Promise<RefreshSessionResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const session = await this.userSessions.refreshSessionByRefreshToken(
        refreshToken,
        tx,
        userAgent,
        ipAddress,
        undefined, // isVerified defaults to true in signSession
        undefined, // mfaVerified derives from session state
        requestBaseUrl
      );

      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      return session;
    });
  }

  public async setupMfa(
    userId: string,
    accountName: string
  ): Promise<{
    factorId: string;
    secret: string;
    otpAuthUrl: string;
  }> {
    return this.db.withTransaction(async (tx: Transaction) => {
      return this.userMfa.setupTotp(userId, accountName, tx);
    });
  }

  public async verifyMfa(
    userId: string,
    sessionId: string,
    code: string,
    requestBaseUrl?: string
  ): Promise<{ accessToken: string; refreshToken: string; mfaVerified: boolean }> {
    return this.db.withTransaction(async (tx: Transaction) => {
      const result = await this.userMfa.verifyTotp(userId, code, tx);
      if (!result.verified) {
        throw new AuthenticationError('Invalid MFA code');
      }
      await this.userSessions.markMfaVerified(sessionId, tx);
      const session = await this.userSessions.getUserSession(sessionId, tx);
      const signed = await this.userSessions.signSession(session, true, true, requestBaseUrl);
      return {
        accessToken: signed.accessToken,
        refreshToken: signed.refreshToken,
        mfaVerified: true,
      };
    });
  }

  /**
   * Completes MFA challenge using a one-time recovery code (same session elevation as verifyMfa).
   */
  public async verifyMfaRecoveryCode(
    userId: string,
    sessionId: string,
    code: string,
    requestBaseUrl?: string
  ): Promise<{ accessToken: string; refreshToken: string; mfaVerified: boolean }> {
    return this.db.withTransaction(async (tx: Transaction) => {
      const ok = await this.userMfa.verifyRecoveryCode(userId, code, tx);
      if (!ok) {
        throw new AuthenticationError('Invalid recovery code');
      }
      await this.userSessions.markMfaVerified(sessionId, tx);
      const session = await this.userSessions.getUserSession(sessionId, tx);
      const signed = await this.userSessions.signSession(session, true, true, requestBaseUrl);
      return {
        accessToken: signed.accessToken,
        refreshToken: signed.refreshToken,
        mfaVerified: true,
      };
    });
  }

  public async logout(refreshToken: string): Promise<boolean> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      return await this.userSessions.revokeSessionByRefreshToken(refreshToken, tx);
    });
  }

  public async verifyEmail(token: string, locale?: SupportedLocale): Promise<VerifyEmailResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      await this.userAuthenticationMethods.verifyEmail(token, tx);
      return {
        success: true,
        message: translateStatic('common.success.emailVerified', locale),
        messageKey: 'common:success.emailVerified',
      };
    });
  }

  public async resendVerificationEmail(
    email: string,
    locale?: SupportedLocale,
    requestLogger?: ILogger
  ): Promise<ResendVerificationResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { token, validUntil } = await this.userAuthenticationMethods.resendVerificationEmail(
        email,
        tx
      );

      try {
        await this.email.sendOtp({ to: email, token, validUntil, locale });
      } catch (error) {
        (requestLogger ?? this.logger).error({
          msg: 'Error sending verification email',
          err: error,
        });
        throw new AuthenticationError('Failed to send verification email');
      }

      return {
        success: true,
        message: translateStatic('common.success.verificationEmailSent', locale),
        messageKey: 'common:success.verificationEmailSent',
      };
    });
  }

  public async requestPasswordReset(
    email: string,
    locale?: SupportedLocale,
    requestLogger?: ILogger
  ): Promise<RequestPasswordResetResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const otp = await this.userAuthenticationMethods.requestPasswordReset(email, tx);

      if (!otp) {
        return {
          success: true,
          message: translateStatic('common.success.passwordResetEmailSent', locale),
          messageKey: 'common:success.passwordResetEmailSent',
        };
      }

      try {
        await this.email.sendPasswordReset({
          to: email,
          token: otp.token,
          validUntil: otp.validUntil,
          locale,
        });
      } catch (error) {
        (requestLogger ?? this.logger).error({
          msg: 'Error sending password reset email',
          err: error,
        });
        throw new AuthenticationError('Failed to send password reset email');
      }

      return {
        success: true,
        message: translateStatic('common.success.passwordResetEmailSent', locale),
        messageKey: 'common:success.passwordResetEmailSent',
      };
    });
  }

  public async resetPassword(
    token: string,
    newPassword: string,
    locale?: SupportedLocale,
    requestLogger?: ILogger
  ): Promise<ResetPasswordResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const userId = await this.userAuthenticationMethods.resetPassword(token, newPassword, tx);

      if (!userId) {
        throw new AuthenticationError('Invalid or expired token');
      }

      await this.userAuthenticationMethods.invalidateAllUserSessions(userId, tx);

      // Send password change confirmation email
      try {
        // TODO: Implement password change confirmation email
        // await this.email.sendPasswordChangeConfirmation({ to: email, locale });
      } catch (error) {
        (requestLogger ?? this.logger).error({
          msg: 'Error sending password change confirmation email',
          err: error,
        });
        // Don't throw - password reset succeeded, confirmation email is optional
      }

      return {
        success: true,
        message: translateStatic('common.success.passwordReset', locale),
        messageKey: 'common:success.passwordReset',
      };
    });
  }

  public async isAuthorized(input: IsAuthorizedInput): Promise<AuthorizationResult> {
    const { permission, context } = input;

    const auth = this.auth.getAuth();

    if (!auth) {
      return {
        authorized: false,
        reason: AuthorizationReason.InvalidAuthenticationState as AuthorizationReason,
      };
    }

    const { userId, scope, expiresAt, grantedScopes } = auth;

    if (!scope) {
      return {
        authorized: false,
        reason: AuthorizationReason.InvalidScope as AuthorizationReason,
      };
    }

    const cacheKey = this.getAuthorizationCacheKey(
      userId,
      scope,
      permission,
      context,
      grantedScopes
    );
    const cachedResult = await this.getAuthorizationResult<AuthorizationResult>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    const result = await this.auth.isAuthorized(input, userId);

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
    ipAddress?: string | null,
    requestBaseUrl?: string
  ): Promise<LoginResponse> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { userId, providerId, providerData } = params;

      const { providerData: processedProviderData, isVerified } =
        await this.userAuthenticationMethods.processProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          providerData
        );

      const userAuthenticationMethod =
        await this.userAuthenticationMethods.createUserAuthenticationMethod(
          {
            userId,
            provider: UserAuthenticationMethodProvider.Github,
            providerId,
            providerData: processedProviderData,
            isVerified,
          },
          tx
        );

      const usersResult = await this.users.getUsers(
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
        throw new AuthenticationError('User not found');
      }

      const user = usersResult.users[0];

      if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
        throw new AuthenticationError('User does not have an account');
      }

      const session = await this.userSessions.createSession(
        {
          userId: user.id,
          userAuthenticationMethodId: userAuthenticationMethod.id,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          isVerified: true, // GitHub OAuth users are always verified
        },
        tx,
        requestBaseUrl
      );

      const requiresMfaStepUp = await this.computeRequiresMfaStepUp(user.id, false, tx);

      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        mfaVerified: false,
        requiresMfaStepUp,
        accounts: user.accounts ?? [],
        requiresEmailVerification: false,
        verificationExpiry: null,
        email: null,
      };
    });
  }

  /**
   * Resolve global user id from GitHub OAuth callback for project OAuth flow.
   * Finds existing user by provider or email, links GitHub if needed, or creates user + auth method (no account/session).
   * When options.allowSignUp is false and no user exists, throws BadRequestError with sign_up_disabled.
   */
  public async resolveUserIdFromGithubForProject(
    githubUser: {
      id: number;
      login: string;
      email: string | null;
      name: string | null;
      avatar_url: string;
    },
    providerId: string,
    providerData: Record<string, unknown>,
    transaction?: Transaction,
    options?: { allowSignUp?: boolean }
  ): Promise<string> {
    const run = async (tx: Transaction) => {
      const existingAuthMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          undefined,
          tx
        );
      if (existingAuthMethod) return existingAuthMethod.userId;

      if (githubUser.email) {
        const existingEmailAuthMethod =
          await this.userAuthenticationMethods.getUserAuthenticationMethodByEmail(
            githubUser.email,
            tx
          );
        if (existingEmailAuthMethod) {
          const { providerData: processedProviderData, isVerified } =
            await this.userAuthenticationMethods.processProvider(
              UserAuthenticationMethodProvider.Github,
              providerId,
              { ...providerData, action: UserAuthenticationEmailProviderAction.Login }
            );
          await this.userAuthenticationMethods.createUserAuthenticationMethod(
            {
              userId: existingEmailAuthMethod.userId,
              provider: UserAuthenticationMethodProvider.Github,
              providerId,
              providerData: processedProviderData,
              isVerified,
            },
            tx
          );
          return existingEmailAuthMethod.userId;
        }
      }

      if (options?.allowSignUp === false) {
        throw new BadRequestError('Sign-up is disabled for this app');
      }

      // Re-check by provider so we never create a duplicate when (github, providerId) already exists
      // (e.g. first lookup missed due to timing or providerId format).
      const existingByProviderAgain =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          undefined,
          tx
        );
      if (existingByProviderAgain) return existingByProviderAgain.userId;

      const name = githubUser.name ?? githubUser.login ?? 'User';
      const { providerData: processedProviderData, isVerified } =
        await this.userAuthenticationMethods.processProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          { ...providerData, action: UserAuthenticationEmailProviderAction.Register }
        );
      const user = await this.users.createUser({ name }, tx);
      await this.userAuthenticationMethods.createUserAuthenticationMethod(
        {
          userId: user.id,
          provider: UserAuthenticationMethodProvider.Github,
          providerId,
          providerData: processedProviderData,
          isVerified,
        },
        tx
      );
      return user.id;
    };

    if (transaction) return run(transaction);
    return this.db.withTransaction(run);
  }

  /**
   * Resolve global user id from email for project OAuth flow (e.g. magic link).
   * Finds existing user by email auth method, or creates user + email auth method (no password, magic-link only).
   * When options.allowSignUp is false and no user exists, throws BadRequestError with sign_up_disabled.
   */
  public async resolveUserIdFromEmailForProject(
    email: string,
    transaction?: Transaction,
    options?: { allowSignUp?: boolean }
  ): Promise<string> {
    const emailNorm = email.trim().toLowerCase();
    const run = async (tx: Transaction) => {
      const existing = await this.userAuthenticationMethods.getUserAuthenticationMethodByEmail(
        emailNorm,
        tx
      );
      if (existing) {
        if (
          existing.provider === UserAuthenticationMethodProvider.Email &&
          existing.isVerified === false
        ) {
          await this.userAuthenticationMethods.updateUserAuthenticationMethod(
            existing.id,
            { isVerified: true },
            tx
          );
        }
        return existing.userId;
      }

      if (options?.allowSignUp === false) {
        throw new BadRequestError('Sign-up is disabled for this app');
      }

      const name = emailNorm.split('@')[0] || 'User';
      const user = await this.users.createUser({ name }, tx);
      await this.userAuthenticationMethods.createUserAuthenticationMethod(
        {
          userId: user.id,
          provider: UserAuthenticationMethodProvider.Email,
          providerId: emailNorm,
          providerData: {},
          isVerified: true,
        },
        tx
      );
      return user.id;
    };

    if (transaction) return run(transaction);
    return this.db.withTransaction(run);
  }

  public async isPersonalScope(scope: Scope): Promise<boolean> {
    let accountId: string | undefined;

    if (scope.tenant === Tenant.Account) {
      accountId = scope.id;
    } else if (
      scope.tenant === Tenant.AccountProject ||
      scope.tenant === Tenant.AccountProjectUser
    ) {
      // AccountProject and AccountProjectUser scopes have format "accountId:projectId" or "accountId:projectId:userId"
      accountId = scope.id.split(':')[0];
    }

    if (!accountId) {
      return false;
    }

    const accountsResult = await this.accounts.getAccounts({
      ids: [accountId],
      limit: 1,
    });

    return accountsResult.accounts[0]?.type === AccountType.Personal;
  }
}
