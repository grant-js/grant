import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { Octokit } from '@octokit/rest';

import { config } from '@/config';
import { AuthenticationError, ConfigurationError } from '@/lib/errors';
import { createModuleLogger } from '@/lib/logger';
import { generateSecureToken } from '@/lib/token.lib';
import { validateInput } from '@/services/common';

import {
  githubAccessTokenSchema,
  githubAuthorizationCodeSchema,
  githubUserInfoSchema,
  oauthStateTokenSchema,
  redirectUrlSchema,
} from './github-oauth.schemas';

export interface GitHubUserInfo {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
}

export interface GenerateStateParams {
  redirectUrl?: string;
  accountType?: string;
  userId?: string; // For connect flow from settings page
  action?: UserAuthenticationEmailProviderAction; // Action type
}

export interface OAuthState {
  state: string;
  redirectUrl?: string;
  accountType?: string;
  userId?: string; // For connect flow from settings page
  action?: UserAuthenticationEmailProviderAction; // Action type
  createdAt: number;
}

export class GitHubOAuthService {
  private readonly logger = createModuleLogger('GitHubOAuthService');
  private readonly octokit: Octokit | null = null;

  constructor() {
    if (config.githubOAuth.clientId && config.githubOAuth.clientSecret) {
      this.octokit = new Octokit({
        auth: config.githubOAuth.clientSecret,
      });
    }
  }

  getAuthorizationUrl(state: string, redirectUrl?: string): string {
    const context = 'GitHubOAuthService.getAuthorizationUrl';

    const validatedState = validateInput(oauthStateTokenSchema, state, context);
    const validatedRedirectUrl = redirectUrl
      ? validateInput(redirectUrlSchema, redirectUrl, context)
      : undefined;

    if (!config.githubOAuth.clientId) {
      throw new ConfigurationError(
        'GitHub OAuth is not configured',
        'errors:auth.githubNotConfigured'
      );
    }

    const params = new URLSearchParams({
      client_id: config.githubOAuth.clientId,
      redirect_uri: config.githubOAuth.callbackUrl,
      scope: config.githubOAuth.scopes.join(' '),
      state: validatedState,
      ...(validatedRedirectUrl && { redirect_url: validatedRedirectUrl }),
    });

    return `${config.githubOAuth.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const context = 'GitHubOAuthService.exchangeCodeForToken';

    const validatedCode = validateInput(githubAuthorizationCodeSchema, code, context);

    if (!config.githubOAuth.clientId || !config.githubOAuth.clientSecret) {
      throw new ConfigurationError(
        'GitHub OAuth is not configured',
        'errors:auth.githubNotConfigured'
      );
    }

    try {
      const response = await fetch(config.githubOAuth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.githubOAuth.clientId,
          client_secret: config.githubOAuth.clientSecret,
          code: validatedCode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({
          msg: 'Failed to exchange code for token',
          status: response.status,
          error: errorText,
        });
        throw new AuthenticationError(
          'Failed to exchange authorization code for token',
          'errors:auth.githubTokenExchangeFailed'
        );
      }

      const data = (await response.json()) as { access_token?: string; error?: string };

      if (data.error) {
        this.logger.error({
          msg: 'GitHub OAuth error',
          error: data.error,
        });
        throw new AuthenticationError(
          `GitHub OAuth error: ${data.error}`,
          'errors:auth.githubOAuthError'
        );
      }

      if (!data.access_token) {
        throw new AuthenticationError(
          'No access token received from GitHub',
          'errors:auth.githubNoToken'
        );
      }

      const validatedToken = validateInput(githubAccessTokenSchema, data.access_token, context);
      return validatedToken;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ConfigurationError) {
        throw error;
      }

      this.logger.error({
        msg: 'Error exchanging code for token',
        err: error,
      });

      throw new AuthenticationError(
        'Failed to exchange authorization code',
        'errors:auth.githubTokenExchangeFailed'
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    const context = 'GitHubOAuthService.getUserInfo';

    const validatedAccessToken = validateInput(githubAccessTokenSchema, accessToken, context);

    if (!this.octokit) {
      throw new ConfigurationError(
        'GitHub OAuth is not configured',
        'errors:auth.githubNotConfigured'
      );
    }

    try {
      const userOctokit = new Octokit({
        auth: validatedAccessToken,
      });

      const { data: user } = await userOctokit.rest.users.getAuthenticated();

      let email: string | null = null;
      try {
        const { data: emails } = await userOctokit.rest.users.listEmailsForAuthenticated();
        const primaryEmail = emails.find((e) => e.primary) || emails.find((e) => e.verified);
        email = primaryEmail?.email || emails[0]?.email || null;
      } catch (emailError) {
        this.logger.warn({
          msg: 'Could not fetch user email from GitHub',
          err: emailError,
        });
      }

      const userInfo = {
        id: user.id,
        login: user.login,
        email,
        name: user.name || null,
        avatar_url: user.avatar_url,
        bio: user.bio || null,
        company: user.company || null,
        location: user.location || null,
      };

      return validateInput(githubUserInfoSchema, userInfo, context);
    } catch (error) {
      this.logger.error({
        msg: 'Error fetching user info from GitHub',
        err: error,
      });

      throw new AuthenticationError(
        'Failed to fetch user information from GitHub',
        'errors:auth.githubUserInfoFailed'
      );
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const userOctokit = new Octokit({
        auth: accessToken,
      });

      await userOctokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  generateState(params: GenerateStateParams): OAuthState {
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

  isConfigured(): boolean {
    return !!(
      config.githubOAuth.clientId &&
      config.githubOAuth.clientSecret &&
      config.githubOAuth.callbackUrl
    );
  }
}
