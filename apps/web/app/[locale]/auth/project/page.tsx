'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Check, Github } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AuthLayoutStandalone } from '@/components/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getApiBaseUrl } from '@/lib/constants';
import {
  getProjectAppPublicInfo,
  ProjectAppInfoError,
  type ProjectAppPublicInfo,
} from '@/lib/project-oauth-api';

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

  const showGithub =
    !appInfo?.enabledProviders?.length ||
    appInfo.enabledProviders.some((p) => p.toLowerCase() === 'github');
  const showEmail =
    !appInfo?.enabledProviders?.length ||
    appInfo.enabledProviders.some((p) => p.toLowerCase() === 'email');

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

  const appName = appInfo.name ?? t('thisApp');
  const content = (
    <div className="space-y-6">
      {oauthErrorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{oauthErrorMessage}</p>
        </div>
      )}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('signInTo', { appName })}</h1>
        <p className="text-muted-foreground">{t('requestingAccess')}</p>
      </div>

      {appInfo.scopes?.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{t('requestedPermissions')}</p>
          <ul className="text-sm text-muted-foreground space-y-2 list-none pl-0">
            {appInfo.scopes.map((s) => (
              <li key={s.slug} className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">{s.name}</span>
                  {s.description && <> — {s.description}</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('signInWith')}</span>
        </div>
      </div>

      <div className="grid gap-2">
        {showGithub && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = authorizeUrl('github');
            }}
          >
            <Github className="size-4" />
            {t('github')}
          </Button>
        )}
        {showEmail && (
          <Link href={emailPageUrl()}>
            <Button type="button" variant="outline" className="w-full">
              {t('email')}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
  return displayPopup ? <AuthLayoutStandalone>{content}</AuthLayoutStandalone> : content;
}
