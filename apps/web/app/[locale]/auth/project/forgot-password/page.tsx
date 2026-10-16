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
import { oauthClientDisplayName, oauthPrimaryButtonStyle } from '@/lib/oauth-branding';
import {
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
  type ProjectAppPublicInfo,
  ProjectOAuthApiError,
  requestProjectPasswordReset,
} from '@/lib/project-oauth-api';
import { buildProjectPasswordSignInHref } from '@/lib/project-password-reset.lib';

type FormValues = { email: string };

/**
 * "Forgot password?" of the hosted project password view (ADR 0011 § 6). The same
 * confirmation is shown for every address that was accepted: the page never says whether
 * the address belongs to a member or an email was sent.
 */
export default function ProjectOAuthForgotPasswordPage() {
  const t = useTranslations('auth.projectOAuth.forgotPassword');
  const tEntry = useTranslations('auth.projectOAuth.entry');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientState = searchParams.get('client_state');
  const scopeParam = searchParams.get('scope');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appInfo, setAppInfo] = useState<ProjectAppPublicInfo | null>(() =>
    clientId ? peekProjectAppPublicInfo(clientId, scopeParam, redirectUri) : null
  );

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

  const schema = useMemo(
    () => z.object({ email: z.email(t('invalidEmail')).min(1, t('emailRequired')) }),
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
      await requestProjectPasswordReset({
        clientId,
        redirectUri,
        email: values.email,
        locale,
        state,
      });
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof ProjectOAuthApiError && e.status === 429
          ? t('tooManyRequests')
          : t('somethingWentWrong')
      );
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

  const appName = oauthClientDisplayName(appInfo?.name, appInfo?.projectName, tEntry('thisApp'));
  const signInHref = buildProjectPasswordSignInHref({
    clientId,
    redirectUri,
    state,
    clientState,
    scope: scopeParam,
  });
  const backToSignIn = (
    <Link
      href={signInHref}
      className="block text-center text-sm text-primary hover:text-primary/80"
    >
      {t('backToSignIn')}
    </Link>
  );

  if (submitted) {
    return (
      <div className="space-y-6">
        <OAuthAppHeading
          title={t('checkEmailTitle')}
          name={appName}
          pictureUrl={appInfo?.pictureUrl}
          description={t('checkEmailDescription')}
        />
        {backToSignIn}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OAuthAppHeading
        title={t('title')}
        name={appName}
        pictureUrl={appInfo?.pictureUrl}
        description={t('description', { appName })}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('emailLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder={t('emailPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
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
      {backToSignIn}
    </div>
  );
}
