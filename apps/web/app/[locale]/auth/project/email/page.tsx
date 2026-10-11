'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OAuthAppHeading } from '@/components/auth/oauth-app-heading';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { getApiBaseUrl } from '@/lib/constants';
import { oauthClientDisplayName, oauthPrimaryButtonStyle } from '@/lib/oauth-branding';
import {
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
  type ProjectAppPublicInfo,
  requestProjectEmailLink,
} from '@/lib/project-oauth-api';
import { buildProjectAuthorizeUrl } from '@/lib/project-oauth-authorize.lib';
import {
  createProjectOAuthState,
  ensureProjectOAuthPkceSession,
  isProjectOAuthEmailViaAuthorize,
  loadProjectOAuthPkceSession,
  markProjectOAuthEmailViaAuthorize,
} from '@/lib/project-oauth-pkce.lib';

type FormValues = { email: string };

export default function ProjectOAuthEmailPage() {
  const t = useTranslations('auth.projectOAuth.email');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientState = searchParams.get('client_state');
  const scopeParam = searchParams.get('scope');
  const incomingChallenge = searchParams.get('code_challenge');
  const incomingChallengeMethod = searchParams.get('code_challenge_method');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(() => Boolean(clientId && redirectUri));
  const [appInfo, setAppInfo] = useState<ProjectAppPublicInfo | null>(() =>
    clientId ? peekProjectAppPublicInfo(clientId, scopeParam, redirectUri) : null
  );
  const tEntry = useTranslations('auth.projectOAuth.entry');

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    getProjectAppPublicInfo(clientId, scopeParam ?? undefined, redirectUri ?? undefined)
      .then((info) => {
        if (!cancelled) setAppInfo(info);
      })
      .catch(() => {
        if (!cancelled) setAppInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, scopeParam, redirectUri]);

  useEffect(() => {
    if (!clientId || !redirectUri) return;
    let cancelled = false;

    const preparePkce = async () => {
      const existing = loadProjectOAuthPkceSession(clientState ?? state);
      const matches =
        existing?.clientId === clientId &&
        existing.redirectUri === redirectUri &&
        isProjectOAuthEmailViaAuthorize();
      if (matches) {
        if (!cancelled) setPreparing(false);
        return;
      }

      const oauthState = (clientState ?? state)?.trim() || createProjectOAuthState();
      const useIncoming =
        Boolean(incomingChallenge?.trim()) &&
        (!incomingChallengeMethod || incomingChallengeMethod === 'S256');
      const session = await ensureProjectOAuthPkceSession({
        clientId,
        redirectUri,
        state: oauthState,
        ...(useIncoming && incomingChallenge ? { challenge: incomingChallenge.trim() } : {}),
      });
      markProjectOAuthEmailViaAuthorize();
      if (cancelled) return;
      window.location.href = buildProjectAuthorizeUrl({
        apiBase: getApiBaseUrl(),
        clientId,
        redirectUri,
        state: session.state,
        provider: 'email',
        locale,
        scope: scopeParam,
        codeChallenge: session.challenge,
      });
    };

    void preparePkce();
    return () => {
      cancelled = true;
    };
  }, [
    clientId,
    redirectUri,
    state,
    clientState,
    scopeParam,
    locale,
    incomingChallenge,
    incomingChallengeMethod,
  ]);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('invalidEmail')).min(1, t('emailRequired')),
      }),
    [t]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: FormValues) => {
    if (!clientId || !redirectUri) {
      setError(t('missingParams'));
      return;
    }
    setError(null);
    try {
      await requestProjectEmailLink({
        clientId,
        redirectUri,
        email: values.email,
        locale,
        state,
        clientState,
        scope: scopeParam,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('somethingWentWrong'));
    }
  };

  if (!clientId || !redirectUri) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-destructive">{t('missingParams')}</p>
        <Link href="/auth/login">
          <Button variant="outline">{t('backToLogin')}</Button>
        </Link>
      </div>
    );
  }

  if (preparing) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t('preparing')}</p>
      </div>
    );
  }

  const appName = oauthClientDisplayName(appInfo?.name, appInfo?.projectName, tEntry('thisApp'));
  const heading = (
    <OAuthAppHeading
      title={submitted ? t('checkEmailTitle') : tEntry('signInTo', { appName })}
      name={appName}
      pictureUrl={appInfo?.pictureUrl}
      description={submitted ? t('checkEmailDescription') : t('description')}
    />
  );

  if (submitted) {
    return <div className="space-y-6">{heading}</div>;
  }

  return (
    <div className="space-y-6">
      {heading}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('emailLabel')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
            style={oauthPrimaryButtonStyle(appInfo?.primaryColor)}
          >
            {form.formState.isSubmitting ? t('sending') : t('sendLink')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
