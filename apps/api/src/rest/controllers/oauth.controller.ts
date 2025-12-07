import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from '@logusgraphics/grant-constants';
import {
  AccountType,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';
import { Response } from 'express';

import { config } from '@/config';
import { createModuleLogger } from '@/lib/logger';
import { BaseController } from '@/rest/controllers/base.controller';
import { TypedRequest } from '@/rest/types';
import { RequestContext } from '@/types';

export class OAuthController extends BaseController {
  private readonly logger = createModuleLogger('OAuthController');

  constructor(context: RequestContext) {
    super(context);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = config.app.isProduction;
    const refreshTokenExpirationDays = config.jwt.refreshTokenExpirationDays;
    const maxAge = refreshTokenExpirationDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    res.cookie(AUTH_ACCESS_TOKEN_KEY, accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    res.cookie(AUTH_REFRESH_TOKEN_KEY, refreshToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  async initiateGithubAuth(
    req: TypedRequest<{
      query: { redirect?: string; accountType?: string; action?: string; userId?: string };
    }>,
    res: Response
  ) {
    const redirectUrl = req.query.redirect as string | undefined;
    const accountType = req.query.accountType as string | undefined;
    const action = req.query.action as UserAuthenticationEmailProviderAction | undefined;

    // For connect flow, require authenticated user
    if (action === UserAuthenticationEmailProviderAction.Connect) {
      if (!this.context.user) {
        const frontendUrl = config.security.frontendUrl;
        const locale = this.context.locale || 'en';
        res.redirect(`${frontendUrl}/${locale}/auth/login?error=authenticationRequired`);
        return;
      }
      // Use authenticated user's ID
      const authenticatedUserId = this.context.user.id;
      const result = await this.handlers.oauth.initiateGithubAuth({
        redirectUrl: redirectUrl || `${config.security.frontendUrl}/dashboard/settings/security`,
        userId: authenticatedUserId,
        action: UserAuthenticationEmailProviderAction.Connect,
      });
      res.redirect(result.authorizationUrl);
      return;
    }

    if (redirectUrl) {
      try {
        const url = new URL(redirectUrl);
        const frontendUrl = new URL(config.security.frontendUrl);

        if (url.origin !== frontendUrl.origin) {
          this.logger.warn({
            msg: 'OAuth initiate - invalid redirect URL origin',
            redirectUrl,
            expectedOrigin: frontendUrl.origin,
          });
          const result = await this.handlers.oauth.initiateGithubAuth({});
          res.redirect(result.authorizationUrl);
          return;
        }
      } catch (error) {
        this.logger.warn({
          msg: 'OAuth initiate - invalid redirect URL format',
          redirectUrl,
          error,
        });
        const result = await this.handlers.oauth.initiateGithubAuth({});
        res.redirect(result.authorizationUrl);
        return;
      }
    }

    const result = await this.handlers.oauth.initiateGithubAuth({
      redirectUrl,
      accountType,
      action: action || UserAuthenticationEmailProviderAction.Login,
    });

    res.redirect(result.authorizationUrl);
  }

  async handleGithubCallback(
    req: TypedRequest<{
      query: { code?: string; state?: string; error?: string; error_description?: string };
    }>,
    res: Response
  ) {
    if (req.query.error) {
      const errorDescription = req.query.error_description || req.query.error;
      this.logger.warn({
        msg: 'GitHub OAuth error',
        error: req.query.error,
        description: errorDescription,
      });

      const frontendUrl = config.security.frontendUrl;
      const locale = this.context.locale || 'en';
      res.redirect(`${frontendUrl}/${locale}/auth/login?error=oauthError`);
      return;
    }

    const code = req.query.code as string | undefined;
    const stateToken = req.query.state as string | undefined;

    try {
      const oauthResult = await this.handlers.oauth.handleGithubCallback(code, stateToken);

      // Check if this is a "connect" flow (user already authenticated from settings page)
      if (
        oauthResult.userId &&
        oauthResult.action === UserAuthenticationEmailProviderAction.Connect
      ) {
        try {
          // Link GitHub to existing user account
          await this.handlers.accounts.linkGithubAuthToExistingUser(
            {
              userId: oauthResult.userId,
              providerId: oauthResult.providerId,
              providerData: {
                accessToken: oauthResult.accessToken,
                githubId: oauthResult.githubUser.id,
                email: oauthResult.githubUser.email,
                name: oauthResult.githubUser.name,
                username: oauthResult.githubUser.login,
                avatarUrl: oauthResult.githubUser.avatar_url,
              },
            },
            this.context.userAgent,
            this.context.ipAddress
          );

          // Redirect back to settings page with success indicator
          const frontendUrl = config.security.frontendUrl;
          const locale = this.context.locale || 'en';
          const redirectUrl =
            oauthResult.redirectUrl || `${frontendUrl}/${locale}/dashboard/settings/security`;
          res.redirect(`${redirectUrl}?connected=github&success=true`);
          return;
        } catch (error) {
          this.logger.error({
            msg: 'Error connecting GitHub account',
            err: error,
          });

          // Handle errors (e.g., provider already connected to another user)
          const frontendUrl = config.security.frontendUrl;
          const locale = this.context.locale || 'en';
          const redirectUrl =
            oauthResult.redirectUrl || `${frontendUrl}/${locale}/dashboard/settings/security`;
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to connect GitHub account';
          res.redirect(`${redirectUrl}?connected=github&error=${encodeURIComponent(errorMessage)}`);
          return;
        }
      }

      let loginResult;

      if (oauthResult.existingAuthMethod) {
        loginResult = await this.handlers.accounts.login(
          {
            input: {
              provider: UserAuthenticationMethodProvider.Github,
              providerId: oauthResult.providerId,
              providerData: {
                accessToken: oauthResult.accessToken,
                githubId: oauthResult.githubUser.id,
                email: oauthResult.githubUser.email,
                name: oauthResult.githubUser.name,
                avatarUrl: oauthResult.githubUser.avatar_url,
              },
            },
          },
          this.context.userAgent,
          this.context.ipAddress
        );
      } else if (oauthResult.existingUserByEmail) {
        loginResult = await this.handlers.accounts.linkGithubAuthToExistingUser(
          {
            userId: oauthResult.existingUserByEmail.userId,
            providerId: oauthResult.providerId,
            providerData: {
              accessToken: oauthResult.accessToken,
              githubId: oauthResult.githubUser.id,
              email: oauthResult.githubUser.email,
              name: oauthResult.githubUser.name,
              username: oauthResult.githubUser.login,
              avatarUrl: oauthResult.githubUser.avatar_url,
            },
          },
          this.context.userAgent,
          this.context.ipAddress
        );
      } else {
        const accountType =
          oauthResult.accountType === AccountType.Organization
            ? AccountType.Organization
            : AccountType.Personal;

        loginResult = await this.handlers.accounts.createAccount(
          {
            type: accountType,
            provider: UserAuthenticationMethodProvider.Github,
            providerId: oauthResult.providerId,
            providerData: {
              accessToken: oauthResult.accessToken,
              githubId: oauthResult.githubUser.id,
              email: oauthResult.githubUser.email,
              name: oauthResult.githubUser.name,
              username: oauthResult.githubUser.login,
              avatarUrl: oauthResult.githubUser.avatar_url,
            },
          },
          this.context.locale,
          this.context.userAgent,
          this.context.ipAddress
        );
      }

      this.setAuthCookies(res, loginResult.accessToken, loginResult.refreshToken);

      const frontendUrl = config.security.frontendUrl;
      const locale = this.context.locale || 'en';

      let finalRedirectUrl: string;

      if (oauthResult.redirectUrl) {
        finalRedirectUrl = oauthResult.redirectUrl;
      } else {
        finalRedirectUrl = `${frontendUrl}/${locale}/dashboard`;
      }

      res.redirect(finalRedirectUrl);
    } catch (error) {
      this.logger.error({
        msg: 'Error handling GitHub OAuth callback',
        err: error,
      });

      const frontendUrl = config.security.frontendUrl;
      const locale = this.context.locale || 'en';
      let errorCode = 'accountCreationFailed';

      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('unique constraint')) {
          errorCode = 'accountExists';
        } else if (error.message.includes('Invalid or expired state')) {
          errorCode = 'invalidState';
        } else if (error.message.includes('not configured')) {
          errorCode = 'oauthNotConfigured';
        }
      }

      res.redirect(`${frontendUrl}/${locale}/auth/login?error=${errorCode}`);
    }
  }
}
