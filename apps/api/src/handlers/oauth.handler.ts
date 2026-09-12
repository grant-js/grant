import crypto from 'node:crypto';

import type {
  ILogger,
  IOAuthProviderService,
  IOAuthStateService,
  ITransactionalConnection,
  IUserAuthenticationMethodService,
  OAuthState,
  OAuthUserInfo,
} from '@grantjs/core';
import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { config, SOCIAL_OAUTH_PROVIDERS } from '@/config';
import { OAUTH_CLI_CALLBACK_KEY_PREFIX } from '@/constants/cache.constants';
import { CacheHandler, type ScopeServices } from '@/handlers/base/cache-handler';
import { CacheKey, IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, BadRequestError, ConfigurationError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { generateSecureToken } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

/** Payload stored for CLI OAuth callback and returned from POST /api/auth/cli-callback */
export interface CliCallbackPayload {
  accessToken: string;
  refreshToken: string;
  accounts: Array<{ id: string; type: string; ownerId?: string | null; [key: string]: unknown }>;
}

export interface InitiateOAuthAuthParams {
  redirectUrl?: string;
  accountType?: string;
  userId?: string;
  action?: UserAuthenticationEmailProviderAction;
}

export interface InitiateOAuthAuthResult {
  authorizationUrl: string;
}

export interface HandleOAuthCallbackResult {
  provider: UserAuthenticationMethodProvider;
  redirectUrl: string | undefined;
  user: OAuthUserInfo;
  providerId: string;
  accessToken: string;
  providerData: Record<string, unknown>;
  existingAuthMethod: boolean;
  existingUserByEmail: { userId: string; email: string } | null;
  accountType: string | undefined;
  userId?: string;
  action?: UserAuthenticationEmailProviderAction;
}

/** @deprecated Use InitiateOAuthAuthParams */
export type InitiateGithubAuthParams = InitiateOAuthAuthParams;
/** @deprecated Use InitiateOAuthAuthResult */
export type InitiateGithubAuthResult = InitiateOAuthAuthResult;
/** @deprecated Use HandleOAuthCallbackResult */
export type HandleGithubCallbackResult = HandleOAuthCallbackResult;

export class OAuthHandler extends CacheHandler {
  protected readonly logger = createLogger('OAuthHandler');

  constructor(
    private readonly oauthProviders: ReadonlyMap<
      UserAuthenticationMethodProvider,
      IOAuthProviderService
    >,
    private readonly oauthState: IOAuthStateService,
    private readonly userAuthenticationMethods: IUserAuthenticationMethodService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  async listProviders(): Promise<
    Array<{ id: UserAuthenticationMethodProvider; configured: boolean }>
  > {
    const providers = await Promise.all(
      SOCIAL_OAUTH_PROVIDERS.map(async (id) => {
        const service = this.oauthProviders.get(id);
        return {
          id,
          configured: service ? await service.isConfigured() : false,
        };
      })
    );
    return providers;
  }

  public async initiateGithubAuth(
    params: InitiateOAuthAuthParams
  ): Promise<InitiateOAuthAuthResult> {
    return this.initiateAuth(UserAuthenticationMethodProvider.Github, params);
  }

  public async initiateAuth(
    provider: UserAuthenticationMethodProvider,
    params: InitiateOAuthAuthParams
  ): Promise<InitiateOAuthAuthResult> {
    const oauth = this.requireProvider(provider);

    if (!(await oauth.isConfigured())) {
      throw new ConfigurationError(`${this.providerLabel(provider)} OAuth is not configured`);
    }

    const state = this.generateState(params);
    await this.oauthState.storeState(state);

    const authorizationUrl = oauth.getAuthorizationUrl(state.state, params.redirectUrl);

    return { authorizationUrl };
  }

  public async handleGithubCallback(
    code: string | undefined,
    stateToken: string | undefined
  ): Promise<HandleOAuthCallbackResult> {
    return this.handleCallback(UserAuthenticationMethodProvider.Github, code, stateToken);
  }

  public async handleCallback(
    provider: UserAuthenticationMethodProvider,
    code: string | undefined,
    stateToken: string | undefined
  ): Promise<HandleOAuthCallbackResult> {
    const oauth = this.requireProvider(provider);

    if (!(await oauth.isConfigured())) {
      throw new ConfigurationError(`${this.providerLabel(provider)} OAuth is not configured`);
    }

    const isValidState = await this.oauthState.validateState(stateToken as string);
    if (!isValidState) {
      throw new AuthenticationError('Invalid or expired state parameter');
    }

    const storedState = await this.oauthState.getState(stateToken as string);
    if (!storedState) {
      throw new AuthenticationError('State not found');
    }

    await this.oauthState.deleteState(stateToken as string);

    return await this.db.withTransaction(async (tx: Transaction) => {
      const accessToken = await oauth.exchangeCodeForToken(code as string);
      const user = await oauth.getOAuthUserInfo(accessToken);
      const providerId = user.id;
      const providerData = oauth.buildProviderData(user, accessToken, true);

      let existingAuthMethod =
        await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          provider,
          providerId,
          undefined,
          tx
        );

      let existingUserByEmail: { userId: string; email: string } | null = null;

      if (!existingAuthMethod && user.email && !storedState.userId) {
        const existingEmailAuthMethod =
          await this.userAuthenticationMethods.getUserAuthenticationMethodByEmail(user.email, tx);

        if (existingEmailAuthMethod) {
          const cannotAutoLink = !user.emailVerified || existingEmailAuthMethod.isVerified !== true;

          if (cannotAutoLink) {
            throw new BadRequestError('Email is not verified');
          }

          existingUserByEmail = {
            userId: existingEmailAuthMethod.userId,
            email: user.email,
          };
        }
      }

      if (!existingAuthMethod && !existingUserByEmail) {
        existingAuthMethod =
          await this.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
            provider,
            providerId,
            undefined,
            tx
          );
      }

      return {
        provider,
        redirectUrl: storedState.redirectUrl,
        user,
        providerId,
        accessToken,
        providerData,
        existingAuthMethod: !!existingAuthMethod,
        existingUserByEmail,
        accountType: storedState.accountType,
        userId: storedState.userId,
        action: storedState.action,
      };
    });
  }

  private static readonly CALLBACK_TTL_SECONDS = config.githubOAuth.cliCallbackTtlSeconds;

  async storeCliCallbackPayload(
    payload: CliCallbackPayload,
    requestLogger?: ILogger
  ): Promise<string> {
    const code = crypto.randomBytes(16).toString('hex');
    const key = `${OAUTH_CLI_CALLBACK_KEY_PREFIX}${code}` as CacheKey;
    await this.cache.oauth.set(key, payload, OAuthHandler.CALLBACK_TTL_SECONDS);
    (requestLogger ?? this.logger).debug({
      msg: 'Stored CLI callback payload',
      codePrefix: code.slice(0, 8),
    });
    return code;
  }

  async consumeCliCallbackCode(
    code: string,
    requestLogger?: ILogger
  ): Promise<CliCallbackPayload | null> {
    if (!code?.trim()) return null;
    const key = `${OAUTH_CLI_CALLBACK_KEY_PREFIX}${code.trim()}` as CacheKey;
    const payload = await this.cache.oauth.get<CliCallbackPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) return null;
    (requestLogger ?? this.logger).debug({
      msg: 'Consumed CLI callback code',
      codePrefix: code.slice(0, 8),
    });
    return payload;
  }

  async getStoredState(stateToken: string): Promise<{ redirectUrl?: string } | null> {
    return this.oauthState.getState(stateToken);
  }

  private requireProvider(provider: UserAuthenticationMethodProvider): IOAuthProviderService {
    const oauth = this.oauthProviders.get(provider);
    if (!oauth) {
      throw new BadRequestError(`Unknown OAuth provider: ${provider}`);
    }
    return oauth;
  }

  private providerLabel(provider: UserAuthenticationMethodProvider): string {
    if (provider === UserAuthenticationMethodProvider.Google) return 'Google';
    if (provider === UserAuthenticationMethodProvider.Github) return 'GitHub';
    return String(provider);
  }

  private generateState(params: InitiateOAuthAuthParams): OAuthState {
    const stateToken = generateSecureToken(config.githubOAuth.stateValidityMinutes, 32);
    return {
      state: stateToken.token,
      redirectUrl: params.redirectUrl,
      accountType: params.accountType,
      userId: params.userId,
      action:
        params.action ||
        (params.userId
          ? UserAuthenticationEmailProviderAction.Connect
          : UserAuthenticationEmailProviderAction.Login),
      createdAt: Date.now(),
    };
  }
}
