import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  MILLISECONDS_PER_DAY,
} from '@grantjs/constants';
import {
  AccountType,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { Response } from 'express';

import { config } from '@/config';
import { HandleGithubCallbackResult } from '@/handlers/oauth.handler';
import { createModuleLogger } from '@/lib/logger';
import { RequestContext } from '@/types';

const logger = createModuleLogger('AuthUtils');

/**
 * Sets authentication cookies on the response
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProduction = config.app.isProduction;
  const refreshTokenExpirationDays = config.jwt.refreshTokenExpirationDays;
  const maxAge = refreshTokenExpirationDays * MILLISECONDS_PER_DAY;

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

/**
 * Validates that a redirect URL is from the same origin as the frontend
 */
export function validateRedirectUrl(redirectUrl: string): boolean {
  try {
    const url = new URL(redirectUrl);
    const frontendUrl = new URL(config.security.frontendUrl);
    return url.origin === frontendUrl.origin;
  } catch {
    return false;
  }
}

/**
 * Builds provider data object from GitHub user information
 */
export function buildGithubProviderData(
  githubUser: HandleGithubCallbackResult['githubUser'],
  accessToken: string,
  includeUsername = false
): Record<string, unknown> {
  const providerData: Record<string, unknown> = {
    accessToken,
    githubId: githubUser.id.toString(),
    email: githubUser.email,
    name: githubUser.name,
    avatarUrl: githubUser.avatar_url,
  };

  if (includeUsername) {
    providerData.username = githubUser.login;
  }

  return providerData;
}

/**
 * Handles the GitHub OAuth connect flow (linking GitHub to existing authenticated user)
 */
export async function handleGithubConnectFlow(
  context: RequestContext,
  redirectUrl: string | undefined,
  authenticatedUserId: string
): Promise<string> {
  const defaultRedirectUrl = `${config.security.frontendUrl}/dashboard/settings/security`;
  const result = await context.handlers.oauth.initiateGithubAuth({
    redirectUrl: redirectUrl || defaultRedirectUrl,
    userId: authenticatedUserId,
    action: UserAuthenticationEmailProviderAction.Connect,
  });
  return result.authorizationUrl;
}

/**
 * Handles connecting GitHub account to an existing user
 */
export async function connectGithubToUser(
  context: RequestContext,
  oauthResult: HandleGithubCallbackResult
): Promise<void> {
  await context.handlers.auth.linkGithubAuthToExistingUser(
    {
      userId: oauthResult.userId!,
      providerId: oauthResult.providerId,
      providerData: buildGithubProviderData(oauthResult.githubUser, oauthResult.accessToken, true),
    },
    context.userAgent,
    context.ipAddress
  );
}

/**
 * Builds redirect URL for GitHub connect flow
 */
export function buildConnectRedirectUrl(
  oauthResult: HandleGithubCallbackResult,
  success: boolean,
  error?: string
): string {
  const frontendUrl = config.security.frontendUrl;
  const locale = 'en'; // Default locale for settings redirect
  const baseUrl = oauthResult.redirectUrl || `${frontendUrl}/${locale}/dashboard/settings/security`;

  if (success) {
    return `${baseUrl}?connected=github&success=true`;
  }

  const errorParam = error ? `&error=${encodeURIComponent(error)}` : '';
  return `${baseUrl}?connected=github${errorParam}`;
}

/**
 * Handles GitHub OAuth callback for connect flow
 */
export async function handleGithubCallbackConnect(
  context: RequestContext,
  res: Response,
  oauthResult: HandleGithubCallbackResult
): Promise<boolean> {
  if (!oauthResult.userId || oauthResult.action !== UserAuthenticationEmailProviderAction.Connect) {
    return false;
  }

  try {
    await connectGithubToUser(context, oauthResult);
    const redirectUrl = buildConnectRedirectUrl(oauthResult, true);
    res.redirect(redirectUrl);
    return true;
  } catch (error) {
    logger.error({
      msg: 'Error connecting GitHub account',
      err: error,
    });

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to connect GitHub account';
    const redirectUrl = buildConnectRedirectUrl(oauthResult, false, errorMessage);
    res.redirect(redirectUrl);
    return true;
  }
}

/**
 * Handles GitHub OAuth callback for authentication flow (login/register)
 */
export async function handleGithubCallbackAuth(
  context: RequestContext,
  oauthResult: HandleGithubCallbackResult
): Promise<{ accessToken: string; refreshToken: string }> {
  const providerData = buildGithubProviderData(oauthResult.githubUser, oauthResult.accessToken);

  if (oauthResult.existingAuthMethod) {
    // User has existing GitHub auth method - login
    return await context.handlers.auth.login(
      {
        input: {
          provider: UserAuthenticationMethodProvider.Github,
          providerId: oauthResult.providerId,
          providerData,
        },
      },
      context.userAgent,
      context.ipAddress
    );
  }

  if (oauthResult.existingUserByEmail) {
    // User exists by email - link GitHub and login
    return await context.handlers.auth.linkGithubAuthToExistingUser(
      {
        userId: oauthResult.existingUserByEmail.userId,
        providerId: oauthResult.providerId,
        providerData: buildGithubProviderData(
          oauthResult.githubUser,
          oauthResult.accessToken,
          true
        ),
      },
      context.userAgent,
      context.ipAddress
    );
  }

  // New user - register
  const accountType =
    oauthResult.accountType === AccountType.Organization
      ? AccountType.Organization
      : AccountType.Personal;

  return await context.handlers.auth.register(
    {
      type: accountType,
      provider: UserAuthenticationMethodProvider.Github,
      providerId: oauthResult.providerId,
      providerData: buildGithubProviderData(oauthResult.githubUser, oauthResult.accessToken, true),
    },
    context.locale,
    context.userAgent,
    context.ipAddress
  );
}

/**
 * Builds final redirect URL after successful authentication
 */
export function buildAuthRedirectUrl(
  oauthResult: HandleGithubCallbackResult,
  locale: string
): string {
  if (oauthResult.redirectUrl) {
    return oauthResult.redirectUrl;
  }

  const frontendUrl = config.security.frontendUrl;
  return `${frontendUrl}/${locale}/dashboard`;
}

/**
 * Determines error code from error message
 */
export function determineErrorCode(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'accountCreationFailed';
  }

  const message = error.message.toLowerCase();

  if (message.includes('duplicate') || message.includes('unique constraint')) {
    return 'accountExists';
  }

  if (message.includes('invalid or expired state')) {
    return 'invalidState';
  }

  if (message.includes('not configured')) {
    return 'oauthNotConfigured';
  }

  return 'accountCreationFailed';
}

/**
 * Handles GitHub OAuth error and redirects to login page
 */
export function handleGithubOAuthError(
  res: Response,
  error: string | undefined,
  errorDescription: string | undefined,
  locale: string
): void {
  logger.warn({
    msg: 'GitHub OAuth error',
    error: error || 'unknown',
    description: errorDescription,
  });

  const frontendUrl = config.security.frontendUrl;
  res.redirect(`${frontendUrl}/${locale}/auth/login?error=oauthError`);
}
