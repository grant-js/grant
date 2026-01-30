import crypto from 'node:crypto';

import { DbSchema } from '@grantjs/database';
import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';

import { CacheHandler } from '@/handlers/base/cache-handler';
import { CacheKey, IEntityCacheAdapter } from '@/lib/cache';
import { AuthenticationError, ConfigurationError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { GitHubUserInfo } from '@/services/github-oauth.service';

/** Payload stored for CLI OAuth callback and returned from POST /api/auth/cli-callback */
export interface CliCallbackPayload {
  accessToken: string;
  refreshToken: string;
  accounts: Array<{ id: string; type: string; ownerId?: string | null; [key: string]: unknown }>;
}

export interface InitiateGithubAuthParams {
  redirectUrl?: string;
  accountType?: string;
  userId?: string; // For connect flow from settings page
  action?: UserAuthenticationEmailProviderAction;
}

export interface InitiateGithubAuthResult {
  authorizationUrl: string;
}

export interface HandleGithubCallbackResult {
  redirectUrl: string | undefined;
  githubUser: GitHubUserInfo;
  providerId: string;
  accessToken: string;
  existingAuthMethod: boolean;
  existingUserByEmail: { userId: string; email: string } | null;
  accountType: string | undefined;
  userId?: string; // For connect flow
  action?: UserAuthenticationEmailProviderAction; // Action type
}

export class OAuthHandler extends CacheHandler {
  protected readonly logger = createModuleLogger('OAuthHandler');

  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async initiateGithubAuth(
    params: InitiateGithubAuthParams
  ): Promise<InitiateGithubAuthResult> {
    if (!this.services.githubOAuth.isConfigured()) {
      throw new ConfigurationError(
        'GitHub OAuth is not configured',
        'errors:auth.githubNotConfigured'
      );
    }

    const state = this.services.githubOAuth.generateState({
      redirectUrl: params.redirectUrl,
      accountType: params.accountType,
      userId: params.userId,
      action: params.action,
    });

    await this.services.oauthState.storeState(state);

    const authorizationUrl = this.services.githubOAuth.getAuthorizationUrl(
      state.state,
      params.redirectUrl
    );

    return {
      authorizationUrl,
    };
  }

  public async handleGithubCallback(
    code: string | undefined,
    stateToken: string | undefined
  ): Promise<HandleGithubCallbackResult> {
    if (!this.services.githubOAuth.isConfigured()) {
      throw new ConfigurationError(
        'GitHub OAuth is not configured',
        'errors:auth.githubNotConfigured'
      );
    }

    const isValidState = await this.services.oauthState.validateState(stateToken as string);
    if (!isValidState) {
      throw new AuthenticationError(
        'Invalid or expired state parameter',
        'errors:auth.invalidState'
      );
    }

    const storedState = await this.services.oauthState.getState(stateToken as string);
    if (!storedState) {
      throw new AuthenticationError('State not found', 'errors:auth.stateNotFound');
    }

    await this.services.oauthState.deleteState(stateToken as string);

    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const accessToken = await this.services.githubOAuth.exchangeCodeForToken(code as string);

      const githubUser = await this.services.githubOAuth.getUserInfo(accessToken);

      const providerId = githubUser.id.toString();

      const existingAuthMethod =
        await this.services.userAuthenticationMethods.getUserAuthenticationMethodByProvider(
          UserAuthenticationMethodProvider.Github,
          providerId,
          undefined,
          tx
        );

      let existingUserByEmail: { userId: string; email: string } | null = null;

      if (!existingAuthMethod && githubUser.email) {
        const existingEmailAuthMethod =
          await this.services.userAuthenticationMethods.getUserAuthenticationMethodByEmail(
            githubUser.email,
            tx
          );

        if (existingEmailAuthMethod) {
          existingUserByEmail = {
            userId: existingEmailAuthMethod.userId,
            email: githubUser.email,
          };
        }
      }

      const redirectUrl = storedState.redirectUrl;
      const accountType = storedState.accountType;
      const userId = storedState.userId;
      const action = storedState.action;

      return {
        redirectUrl,
        githubUser,
        providerId,
        accessToken,
        existingAuthMethod: !!existingAuthMethod,
        existingUserByEmail,
        accountType,
        userId,
        action,
      };
    });
  }

  private static readonly CLI_CALLBACK_KEY_PREFIX = 'oauth:cli-callback:' as CacheKey;
  private static readonly CLI_CALLBACK_TTL_SECONDS = 60;

  async storeCliCallbackPayload(payload: CliCallbackPayload): Promise<string> {
    const code = crypto.randomBytes(16).toString('hex');
    const key = `${OAuthHandler.CLI_CALLBACK_KEY_PREFIX}${code}` as CacheKey;
    await this.cache.oauth.set(key, payload, OAuthHandler.CLI_CALLBACK_TTL_SECONDS);
    this.logger.debug({ msg: 'Stored CLI callback payload', codePrefix: code.slice(0, 8) });
    return code;
  }

  async consumeCliCallbackCode(code: string): Promise<CliCallbackPayload | null> {
    if (!code?.trim()) return null;
    const key = `${OAuthHandler.CLI_CALLBACK_KEY_PREFIX}${code.trim()}` as CacheKey;
    const payload = await this.cache.oauth.get<CliCallbackPayload>(key);
    await this.cache.oauth.delete(key);
    if (!payload) return null;
    this.logger.debug({ msg: 'Consumed CLI callback code', codePrefix: code.slice(0, 8) });
    return payload;
  }

  async getStoredState(stateToken: string): Promise<{ redirectUrl?: string } | null> {
    return this.services.oauthState.getState(stateToken);
  }
}
