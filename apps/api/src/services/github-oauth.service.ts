import { UserAuthenticationEmailProviderAction } from '@grantjs/schema';
import { Octokit } from '@octokit/rest';

import { config } from '@/config';
import { AuthenticationError, ConfigurationError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
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

import type { IGitHubOAuthService } from '@grantjs/core';

export class GitHubOAuthService implements IGitHubOAuthService {
  private readonly logger = createLogger('GitHubOAuthService');
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
      throw new ConfigurationError('GitHub OAuth is not configured');
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
      throw new ConfigurationError('GitHub OAuth is not configured');
    }

    const redirectUri = config.githubOAuth.callbackUrl;

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
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error({
          msg: 'Failed to exchange code for token',
          status: response.status,
          error: errorText,
        });
        const isGitHubUnavailable =
          response.status === 503 ||
          (response.status >= 500 && response.status < 600) ||
          (errorText.includes('Unicorn') && errorText.includes('No server is currently available'));
        const message = isGitHubUnavailable
          ? 'GitHub is temporarily unavailable. Please try again in a moment.'
          : 'Failed to exchange authorization code for token';
        throw new AuthenticationError(message);
      }

      const data = (await response.json()) as { access_token?: string; error?: string };

      if (data.error) {
        this.logger.error({
          msg: 'GitHub OAuth error',
          error: data.error,
        });
        throw new AuthenticationError(`GitHub OAuth error: ${data.error}`);
      }

      if (!data.access_token) {
        throw new AuthenticationError('No access token received from GitHub');
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

      throw new AuthenticationError('Failed to exchange authorization code');
    }
  }

  async getUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    const context = 'GitHubOAuthService.getUserInfo';

    const validatedAccessToken = validateInput(githubAccessTokenSchema, accessToken, context);

    if (!this.octokit) {
      throw new ConfigurationError('GitHub OAuth is not configured');
    }

    try {
      const userOctokit = new Octokit({
        auth: validatedAccessToken,
      });

      const { data: user } = await userOctokit.rest.users.getAuthenticated();

      let email: string | null = null;
      try {
        const { data: emails } = await userOctokit.rest.users.listEmailsForAuthenticatedUser();
        const primaryEmail = emails.find((e) => e.primary) || emails.find((e) => e.verified);
        email = primaryEmail?.email || emails[0]?.email || null;
      } catch (emailError) {
        this.logger.warn({
          msg: 'Could not fetch user email from GitHub',
          err: emailError,
        });
      }

      const avatarUrl =
        typeof user.avatar_url === 'string' && user.avatar_url.startsWith('http')
          ? user.avatar_url
          : config.githubOAuth.defaultAvatarUrl;

      const userInfo = {
        id: user.id,
        login: user.login,
        email: email === '' ? null : email,
        name: user.name || null,
        avatar_url: avatarUrl,
        bio: user.bio ?? null,
        company: user.company ?? null,
        location: user.location ?? null,
      };

      return validateInput(githubUserInfoSchema, userInfo, context);
    } catch (error) {
      const causeMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({
        msg: 'Error fetching user info from GitHub',
        err: error,
        cause: causeMessage,
      });

      throw new AuthenticationError(
        'Failed to fetch user information from GitHub',
        error instanceof Error ? error : undefined
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
