'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';

import { OAuthAppHeading } from '@/components/auth/oauth-app-heading';
import { OAuthPermissionsCard } from '@/components/auth/oauth-permissions-card';
import { OAuthProviderIcon } from '@/components/common/oauth-provider-icon';
import { useSetOAuthBranding } from '@/components/layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { oauthClientDisplayName, oauthPrimaryButtonStyle } from '@/lib/oauth-branding';
import {
  approveProjectConsent,
  denyProjectConsent,
  getProjectConsentInfo,
  type ProjectConsentInfo,
} from '@/lib/project-oauth-api';

export default function ProjectOAuthConsentPage() {
  const t = useTranslations('auth.projectOAuth.consent');
  const searchParams = useSearchParams();
  const consentToken = searchParams.get('consent_token');

  const [info, setInfo] = useState<ProjectConsentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'allow' | 'deny' | null>(null);
  useSetOAuthBranding(
    info
      ? {
          pictureUrl: info.pictureUrl,
          projectName: info.projectName,
          primaryColor: info.primaryColor,
          showHelpPanel: info.showHelpPanel,
          themeMode: info.themeMode,
        }
      : null
  );

  useEffect(() => {
    if (!consentToken) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    getProjectConsentInfo(consentToken)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [consentToken, t]);

  const hasMissingToken = !consentToken;
  const displayError = hasMissingToken ? t('missingToken') : error;
  const displayLoading = !hasMissingToken && loading;

  const handleAllow = useCallback(async () => {
    if (!consentToken) return;
    setActionLoading('allow');
    try {
      const { redirectUrl } = await approveProjectConsent(consentToken);
      // replace() keeps this window (popup) as the target so relay page sees window.opener
      window.location.replace(redirectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('approveFailed'));
      setActionLoading(null);
    }
  }, [consentToken, t]);

  const handleDeny = useCallback(async () => {
    if (!consentToken) return;
    setActionLoading('deny');
    try {
      const { redirectUrl } = await denyProjectConsent(consentToken);
      window.location.replace(redirectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('denyFailed'));
      setActionLoading(null);
    }
  }, [consentToken, t]);

  if (displayLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (displayError && !info) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-destructive">{displayError}</p>
      </div>
    );
  }

  if (!info) return null;

  const appName = oauthClientDisplayName(info.name, info.projectName, t('thisApp'));

  return (
    <div className="space-y-6">
      <OAuthAppHeading
        title={t('wantsAccess', { appName })}
        name={appName}
        pictureUrl={info.pictureUrl}
        description={t('reviewPermissions')}
      />

      {info.user && (
        <div className="rounded-xl border border-border/80 bg-muted/20 backdrop-blur-sm">
          {info.user.provider ? (
            <>
              <p className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <OAuthProviderIcon provider={info.user.provider} className="size-3.5" />
                <span>
                  {t('signedInWith', {
                    provider: ['email', 'github', 'google'].includes(info.user.provider)
                      ? t(`providers.${info.user.provider}`)
                      : info.user.provider,
                  })}
                </span>
              </p>
              <Separator />
            </>
          ) : null}
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              {info.user.pictureUrl ? <AvatarImage src={info.user.pictureUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {info.user.displayName?.trim() ? (
                  info.user.displayName.slice(0, 2).toUpperCase()
                ) : (
                  <User className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {info.user.displayName || info.user.email || '—'}
              </p>
              {info.user.email ? (
                <p className="truncate text-sm text-muted-foreground">{info.user.email}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {info.scopes?.length ? (
        <OAuthPermissionsCard label={t('permissions')} scopes={info.scopes} />
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleDeny}
          disabled={!!actionLoading}
          className="flex-1"
        >
          {actionLoading === 'deny' ? t('redirecting') : t('deny')}
        </Button>
        <Button
          onClick={handleAllow}
          disabled={!!actionLoading}
          className="flex-1"
          style={oauthPrimaryButtonStyle(info.primaryColor)}
        >
          {actionLoading === 'allow' ? t('redirecting') : t('allow')}
        </Button>
      </div>
    </div>
  );
}
