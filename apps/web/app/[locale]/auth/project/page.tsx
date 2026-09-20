'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { OAuthAppHeading } from '@/components/auth/oauth-app-heading';
import { OAuthPermissionsCard } from '@/components/auth/oauth-permissions-card';
import { OAuthProviderIcon } from '@/components/common/oauth-provider-icon';
import { AuthLayoutStandalone, useSetOAuthBranding } from '@/components/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getApiBaseUrl } from '@/lib/constants';
import { oauthClientDisplayName } from '@/lib/oauth-branding';
import {
  getProjectAppPublicInfo,
  ProjectAppInfoError,
  type ProjectAppPublicInfo,
} from '@/lib/project-oauth-api';
import { getProjectOAuthProviderVisibility } from '@/lib/project-oauth-entry.lib';

const PROJECT_OAUTH_ERROR_CODES = [
  'accountCreationFailed',
  'accountExists',
  'signUpDisabled',
  'invalidState',
  'userNotInProject',
  'scopeResolutionFailed',
  'redirectUriInvalid',
  'oauthNotConfigured',
  'githubUserInfoFailed',
  'githubUnavailable',
  'googleUserInfoFailed',
  'googleUnavailable',
  'emailUnverified',
  'oauthError',
] as const;

export default function ProjectOAuthEntryPage() {
  const t = useTranslations('auth.projectOAuth.entry');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const displayPopup = searchParams.get('display') === 'popup';
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scopeParam = searchParams.get('scope');
  const errorParam = searchParams.get('error');
  const oauthErrorMessage =
    errorParam &&
    PROJECT_OAUTH_ERROR_CODES.includes(errorParam as (typeof PROJECT_OAUTH_ERROR_CODES)[number])
      ? tAuth(`login.oauthErrors.${errorParam}`)
      : null;

  const [appInfo, setAppInfo] = useState<ProjectAppPublicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useSetOAuthBranding(
    appInfo
      ? {
          pictureUrl: appInfo.pictureUrl,
          projectName: appInfo.projectName,
          primaryColor: appInfo.primaryColor,
          showHelpPanel: appInfo.showHelpPanel,
          themeMode: appInfo.themeMode,
        }
      : null
  );

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    getProjectAppPublicInfo(clientId, scopeParam ?? undefined, redirectUri ?? undefined)
      .then((info) => {
        if (!cancelled) setAppInfo(info);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ProjectAppInfoError) {
            const msg = e.body?.details ?? e.body?.error ?? e.message;
            const isRedirectUriInvalid =
              e.status === 400 && msg.includes('redirect_uri') && msg.includes('not allowed');
            setError(isRedirectUriInvalid ? tAuth('login.oauthErrors.redirectUriInvalid') : msg);
          } else {
            setError(e instanceof Error ? e.message : t('failedToLoad'));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, scopeParam, redirectUri, t, tAuth]);

  const hasMissingParams = !clientId || !redirectUri;
  const displayError = hasMissingParams
    ? !clientId
      ? t('missingClientId')
      : t('missingParams')
    : error;
  const displayLoading = !hasMissingParams && loading;

  const authorizeUrl = useCallback(
    (provider: string) => {
      const apiBase = getApiBaseUrl();
      const q = new URLSearchParams({
        client_id: clientId!,
        redirect_uri: redirectUri!,
        state: state ?? '',
        provider,
      });
      if (scopeParam?.trim()) q.set('scope', scopeParam.trim());
      q.set('locale', locale);
      return `${apiBase}/api/auth/project/authorize?${q.toString()}`;
    },
    [clientId, redirectUri, state, scopeParam, locale]
  );

  const emailPageUrl = useCallback(() => {
    const q = new URLSearchParams();
    if (clientId) q.set('client_id', clientId);
    if (redirectUri) q.set('redirect_uri', redirectUri);
    if (state) q.set('state', state);
    if (scopeParam?.trim()) q.set('scope', scopeParam.trim());
    return `/auth/project/email${q.toString() ? `?${q.toString()}` : ''}`;
  }, [clientId, redirectUri, state, scopeParam]);

  const { showGithub, showGoogle, showEmail } = getProjectOAuthProviderVisibility(appInfo);

  if (displayLoading) {
    const loadingContent = (
      <div className="space-y-6">
        {oauthErrorMessage && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{oauthErrorMessage}</AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
    return displayPopup ? (
      <AuthLayoutStandalone>{loadingContent}</AuthLayoutStandalone>
    ) : (
      loadingContent
    );
  }

  if (displayError || hasMissingParams) {
    const content = (
      <div className="space-y-6">
        {oauthErrorMessage && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{oauthErrorMessage}</AlertDescription>
          </Alert>
        )}
        <h1 className="text-3xl font-bold">{t('signInTitle')}</h1>
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/auth/login">
            <Button variant="outline">{t('backToLogin')}</Button>
          </Link>
        </div>
      </div>
    );
    return displayPopup ? <AuthLayoutStandalone>{content}</AuthLayoutStandalone> : content;
  }

  if (!appInfo) return null;

  const appName = oauthClientDisplayName(appInfo.name, appInfo.projectName, t('thisApp'));
  const content = (
    <div className="space-y-6">
      {oauthErrorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{oauthErrorMessage}</p>
        </div>
      )}
      <OAuthAppHeading
        title={t('signInTo', { appName })}
        name={appName}
        pictureUrl={appInfo.pictureUrl}
        description={t('requestingAccess')}
      />

      {appInfo.scopes?.length > 0 && (
        <OAuthPermissionsCard label={t('requestedPermissions')} scopes={appInfo.scopes} />
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('signInWith')}</span>
        </div>
      </div>

      <div className="grid gap-6">
        {showGithub && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = authorizeUrl('github');
            }}
          >
            <OAuthProviderIcon provider="github" />
            {t('github')}
          </Button>
        )}
        {showGoogle && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = authorizeUrl('google');
            }}
          >
            <OAuthProviderIcon provider="google" />
            {t('google')}
          </Button>
        )}
        {showEmail && (
          <Link href={emailPageUrl()}>
            <Button type="button" variant="outline" className="w-full">
              <OAuthProviderIcon provider="email" />
              {t('email')}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
  return displayPopup ? <AuthLayoutStandalone>{content}</AuthLayoutStandalone> : content;
}
