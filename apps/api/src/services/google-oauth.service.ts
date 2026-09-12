import type { IGoogleOAuthService, ISecretResolver, OAuthUserInfo } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';

import { config } from '@/config';
import { AuthenticationError, ConfigurationError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { normalizeOauthPictureUrl } from '@/lib/oauth-picture.lib';
import { validateInput } from '@/services/common';

import { oauthStateTokenSchema, redirectUrlSchema } from './github-oauth.schemas';
import {
  googleAccessTokenSchema,
  googleAuthorizationCodeSchema,
  googleUserInfoSchema,
} from './google-oauth.schemas';

export class GoogleOAuthService implements IGoogleOAuthService {
  readonly provider = UserAuthenticationMethodProvider.Google;
  private readonly logger = createLogger('GoogleOAuthService');

  constructor(private readonly secrets: ISecretResolver) {}

  private resolveClientSecret(): Promise<string | undefined> {
    return this.secrets.resolve('GOOGLE_CLIENT_SECRET');
  }

  private async hasClientCredentials(): Promise<boolean> {
    return Boolean(config.googleOAuth.clientId && (await this.resolveClientSecret()));
  }

  getProjectCallbackUrl(): string {
    return config.googleOAuth.projectCallbackUrl ?? config.googleOAuth.callbackUrl;
  }

  getAuthorizationUrl(state: string, redirectUrl?: string): string {
    const context = 'GoogleOAuthService.getAuthorizationUrl';
    const validatedState = validateInput(oauthStateTokenSchema, state, context);
    if (redirectUrl) {
      validateInput(redirectUrlSchema, redirectUrl, context);
    }

    if (!config.googleOAuth.clientId) {
      throw new ConfigurationError('Google OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.googleOAuth.clientId,
      redirect_uri: config.googleOAuth.callbackUrl,
      response_type: 'code',
      scope: config.googleOAuth.scopes.join(' '),
      state: validatedState,
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
    });

    return `${config.googleOAuth.authorizationUrl}?${params.toString()}`;
  }

  getProjectAuthorizationUrl(state: string): string {
    const context = 'GoogleOAuthService.getProjectAuthorizationUrl';
    const validatedState = validateInput(oauthStateTokenSchema, state, context);
    if (!config.googleOAuth.clientId) {
      throw new ConfigurationError('Google OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.googleOAuth.clientId,
      redirect_uri: this.getProjectCallbackUrl(),
      response_type: 'code',
      scope: config.googleOAuth.scopes.join(' '),
      state: validatedState,
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
    });

    return `${config.googleOAuth.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const context = 'GoogleOAuthService.exchangeCodeForToken';
    const validatedCode = validateInput(googleAuthorizationCodeSchema, code, context);

    if (!(await this.hasClientCredentials())) {
      throw new ConfigurationError('Google OAuth is not configured');
    }

    return this.exchangeCodeForTokenWithRedirect(validatedCode, config.googleOAuth.callbackUrl);
  }

  async exchangeCodeForTokenWithRedirect(code: string, redirectUri: string): Promise<string> {
    const context = 'GoogleOAuthService.exchangeCodeForTokenWithRedirect';
    const validatedCode = validateInput(googleAuthorizationCodeSchema, code, context);
    const clientSecret = await this.resolveClientSecret();
    if (!config.googleOAuth.clientId || !clientSecret) {
      throw new ConfigurationError('Google OAuth is not configured');
    }

    try {
      const response = await fetch(config.googleOAuth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: config.googleOAuth.clientId,
          client_secret: clientSecret,
          code: validatedCode,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      const data = (await response.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!response.ok || data.error) {
        this.logger.error({
          msg: 'Failed to exchange code for token',
          status: response.status,
          error: data.error,
        });
        const isUnavailable = response.status >= 500 && response.status < 600;
        throw new AuthenticationError(
          isUnavailable
            ? 'Google is temporarily unavailable. Please try again in a moment.'
            : 'Failed to exchange authorization code for token'
        );
      }

      if (!data.access_token) {
        throw new AuthenticationError('No access token received from Google');
      }

      return validateInput(googleAccessTokenSchema, data.access_token, context);
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

  async getOAuthUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const context = 'GoogleOAuthService.getOAuthUserInfo';
    const validatedAccessToken = validateInput(googleAccessTokenSchema, accessToken, context);

    if (!(await this.hasClientCredentials())) {
      throw new ConfigurationError('Google OAuth is not configured');
    }

    try {
      const response = await fetch(config.googleOAuth.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${validatedAccessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new AuthenticationError('Failed to fetch user information from Google');
      }

      const data = (await response.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean | string;
        name?: string;
        picture?: unknown;
      };

      if (!data.sub) {
        throw new AuthenticationError('Failed to fetch user information from Google');
      }

      const emailVerified = data.email_verified === true || data.email_verified === 'true';
      const email = data.email && data.email.length > 0 ? data.email : null;

      const userInfo: OAuthUserInfo = {
        id: data.sub,
        email,
        emailVerified: emailVerified && Boolean(email),
        name: data.name || null,
        avatarUrl: normalizeOauthPictureUrl(data.picture),
      };

      return validateInput(googleUserInfoSchema, userInfo, context);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof ConfigurationError) {
        throw error;
      }

      this.logger.error({
        msg: 'Error fetching user info from Google',
        err: error,
      });

      throw new AuthenticationError(
        'Failed to fetch user information from Google',
        error instanceof Error ? error : undefined
      );
    }
  }

  buildProviderData(
    user: OAuthUserInfo,
    accessToken: string,
    includeUsername = false
  ): Record<string, unknown> {
    const providerData: Record<string, unknown> = {
      accessToken,
      googleId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    if (includeUsername && user.username) {
      providerData.username = user.username;
    }

    return providerData;
  }

  async isConfigured(): Promise<boolean> {
    return !!(
      config.googleOAuth.clientId &&
      (await this.resolveClientSecret()) &&
      config.googleOAuth.callbackUrl
    );
  }
}
