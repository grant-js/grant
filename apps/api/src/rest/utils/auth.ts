import type { ILogger } from '@grantjs/core';
import {
  AccountType,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { Response } from 'express';

import { config } from '@/config';
import { HandleOAuthCallbackResult } from '@/handlers/oauth.handler';
import { RequestContext } from '@/types';

/**
 * Validates that a redirect URL is from the same origin as the frontend,
 * or is a localhost URL (for CLI OAuth callback).
 */
export function validateRedirectUrl(redirectUrl: string): boolean {
  try {
    const url = new URL(redirectUrl);
    const frontendUrl = new URL(config.security.frontendUrl);
    if (url.origin === frontendUrl.origin) return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Returns true if the redirect URL is a localhost URL that is NOT the frontend origin (CLI flow).
 * When redirectUrl is the same origin as the frontend (e.g. dev app at localhost:3000), it's the browser flow.
 */
export function isCliRedirectUrl(redirectUrl: string | undefined, frontendUrl: string): boolean {
  if (!redirectUrl) return false;
  try {
    const redirect = new URL(redirectUrl);
    const frontend = new URL(frontendUrl);
    const isLocalhost = redirect.hostname === 'localhost' || redirect.hostname === '127.0.0.1';
    const sameOrigin = redirect.origin === frontend.origin;
    return isLocalhost && !sameOrigin;
  } catch {
    return false;
  }
}

/**
 * Builds provider data object from OAuth user information
 */
function buildOAuthProviderData(oauthResult: HandleOAuthCallbackResult): Record<string, unknown> {
  return oauthResult.providerData;
}

/**
 * Handles the OAuth connect flow (linking a provider to an existing authenticated user)
 */
export async function handleOAuthConnectFlow(
  context: RequestContext,
  provider: UserAuthenticationMethodProvider,
  redirectUrl: string | undefined,
  authenticatedUserId: string
): Promise<string> {
  const defaultRedirectUrl = `${config.security.frontendUrl}/dashboard/settings/security`;
  const result = await context.handlers.oauth.initiateAuth(provider, {
    redirectUrl: redirectUrl || defaultRedirectUrl,
    userId: authenticatedUserId,
    action: UserAuthenticationEmailProviderAction.Connect,
  });
  return result.authorizationUrl;
}

async function connectOAuthToUser(
  context: RequestContext,
  oauthResult: HandleOAuthCallbackResult
): Promise<void> {
  await context.handlers.auth.linkOAuthAuthToExistingUser(
    {
      userId: oauthResult.userId!,
      provider: oauthResult.provider,
      providerId: oauthResult.providerId,
      providerData: buildOAuthProviderData(oauthResult),
    },
    context.userAgent,
    context.ipAddress,
    context.requestBaseUrl
  );
}

function buildConnectRedirectUrl(
  oauthResult: HandleOAuthCallbackResult,
  success: boolean,
  error?: string
): string {
  const frontendUrl = config.security.frontendUrl;
  const locale = 'en';
  const baseUrl = oauthResult.redirectUrl || `${frontendUrl}/${locale}/dashboard/settings/security`;
  const connected = oauthResult.provider;

  if (success) {
    return `${baseUrl}?connected=${connected}&success=true`;
  }

  const errorParam = error ? `&error=${encodeURIComponent(error)}` : '';
  return `${baseUrl}?connected=${connected}${errorParam}`;
}

export async function handleOAuthCallbackConnect(
  context: RequestContext,
  res: Response,
  oauthResult: HandleOAuthCallbackResult
): Promise<boolean> {
  if (!oauthResult.userId || oauthResult.action !== UserAuthenticationEmailProviderAction.Connect) {
    return false;
  }

  try {
    await connectOAuthToUser(context, oauthResult);
    const redirectUrl = buildConnectRedirectUrl(oauthResult, true);
    res.redirect(redirectUrl);
    return true;
  } catch (error) {
    context.requestLogger.error({
      msg: 'Error connecting OAuth account',
      provider: oauthResult.provider,
      err: error,
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to connect OAuth account';
    const redirectUrl = buildConnectRedirectUrl(oauthResult, false, errorMessage);
    res.redirect(redirectUrl);
    return true;
  }
}

/** Result of OAuth auth flow (login/register/link); includes accounts for CLI callback. */
export interface OAuthCallbackAuthResult {
  accessToken: string;
  refreshToken: string;
  accounts: Array<{ id: string; type: string; ownerId?: string | null; [key: string]: unknown }>;
  requiresMfaStepUp: boolean;
}

export async function handleOAuthCallbackAuth(
  context: RequestContext,
  oauthResult: HandleOAuthCallbackResult
): Promise<OAuthCallbackAuthResult> {
  const providerData = buildOAuthProviderData(oauthResult);

  if (oauthResult.existingAuthMethod) {
    const result = await context.handlers.auth.login(
      {
        input: {
          provider: oauthResult.provider,
          providerId: oauthResult.providerId,
          providerData,
        },
      },
      context.userAgent,
      context.ipAddress,
      context.requestBaseUrl
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accounts: result.accounts ?? [],
      requiresMfaStepUp: result.requiresMfaStepUp ?? false,
    };
  }

  if (oauthResult.existingUserByEmail) {
    const result = await context.handlers.auth.linkOAuthAuthToExistingUser(
      {
        userId: oauthResult.existingUserByEmail.userId,
        provider: oauthResult.provider,
        providerId: oauthResult.providerId,
        providerData,
      },
      context.userAgent,
      context.ipAddress,
      context.requestBaseUrl
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accounts: result.accounts ?? [],
      requiresMfaStepUp: result.requiresMfaStepUp ?? false,
    };
  }

  const accountType =
    oauthResult.accountType === AccountType.Organization
      ? AccountType.Organization
      : AccountType.Personal;

  const result = await context.handlers.auth.register(
    {
      type: accountType,
      provider: oauthResult.provider,
      providerId: oauthResult.providerId,
      providerData,
    },
    context.locale,
    context.userAgent,
    context.ipAddress,
    context.requestLogger,
    context.requestBaseUrl
  );
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accounts: [result.account],
    requiresMfaStepUp: false,
  };
}

export function buildAuthRedirectUrl(
  oauthResult: HandleOAuthCallbackResult,
  locale: string
): string {
  if (oauthResult.redirectUrl) {
    return oauthResult.redirectUrl;
  }

  const frontendUrl = config.security.frontendUrl;
  return `${frontendUrl}/${locale}/dashboard`;
}

/**
 * Determines error code from error message for OAuth callback redirects.
 * Use a specific code so the login page can show the right message (e.g. GitHub failure vs account creation).
 */
export function determineErrorCode(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'accountCreationFailed';
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('duplicate') ||
    message.includes('unique constraint') ||
    message.includes('already connected to another account')
  ) {
    return 'accountExists';
  }

  if (message.includes('invalid or expired state')) {
    return 'invalidState';
  }

  if (message.includes('sign-up is disabled') || message.includes('sign_up_disabled')) {
    return 'signUpDisabled';
  }

  if (message.includes('not a member of this project')) {
    return 'userNotInProject';
  }

  if (message.includes('could not resolve scope for project')) {
    return 'scopeResolutionFailed';
  }

  if (
    message.includes('redirect_uri') &&
    (message.includes('mismatch') || message.includes('not allowed'))
  ) {
    return 'redirectUriInvalid';
  }

  if (message.includes('email is not verified') || message.includes('emailunverified')) {
    return 'emailUnverified';
  }

  if (message.includes('not configured')) {
    return 'oauthNotConfigured';
  }

  if (
    message.includes('fetch user information from google') ||
    (message.includes('google') && message.includes('bad credentials'))
  ) {
    return 'googleUserInfoFailed';
  }

  if (
    message.includes('fetch user information from github') ||
    (message.includes('github') && message.includes('bad credentials'))
  ) {
    return 'githubUserInfoFailed';
  }

  if (message.includes('temporarily unavailable') || message.includes('503')) {
    if (message.includes('google')) {
      return 'googleUnavailable';
    }
    return 'githubUnavailable';
  }

  return 'accountCreationFailed';
}

export function handleOAuthError(
  requestLogger: ILogger,
  res: Response,
  error: string | undefined,
  errorDescription: string | undefined,
  locale: string,
  provider?: string
): void {
  requestLogger.warn({
    msg: 'OAuth error',
    provider: provider || 'unknown',
    error: error || 'unknown',
    description: errorDescription,
  });

  const frontendUrl = config.security.frontendUrl;
  res.redirect(`${frontendUrl}/${locale}/auth/login?error=oauthError`);
}
