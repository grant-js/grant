'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { OAuthAppHeading } from '@/components/auth/oauth-app-heading';
import { PasswordInput, PasswordStrengthIndicator } from '@/components/common';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Link } from '@/i18n/navigation';
import { oauthClientDisplayName, oauthPrimaryButtonStyle } from '@/lib/oauth-branding';
import {
  completeProjectPasswordReset,
  getProjectAppPublicInfo,
  peekProjectAppPublicInfo,
  type ProjectAppPublicInfo,
  ProjectOAuthApiError,
} from '@/lib/project-oauth-api';
import {
  buildProjectPasswordResetHref,
  buildProjectPasswordSignInHref,
  readProjectPasswordResetToken,
} from '@/lib/project-password-reset.lib';
import { passwordPolicySchema } from '@/lib/validation/password-policy';

type ResetStatus = 'loading' | 'form' | 'success' | 'invalid-link';

/**
 * The view an emailed project-app reset link opens (ADR 0011 § 6). The one-time token is in
 * the URL fragment; it is read once and removed from the address bar. Opening the link
 * uses nothing up: the token is consumed only when the new password is submitted, so a mail
 * scanner that follows the link cannot burn it.
 */
export default function ProjectOAuthResetPasswordPage() {
  const t = useTranslations('auth.projectOAuth.resetPassword');
  const tEntry = useTranslations('auth.projectOAuth.entry');
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const clientState = searchParams.get('client_state');
  const scopeParam = searchParams.get('scope');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ResetStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [appInfo, setAppInfo] = useState<ProjectAppPublicInfo | null>(() =>
    clientId ? peekProjectAppPublicInfo(clientId, scopeParam, redirectUri) : null
  );

  useEffect(() => {
    const fromFragment = readProjectPasswordResetToken(window.location.hash);
    if (fromFragment) {
      // Out of the address bar and the history entry, but kept in memory for the submit.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setToken(fromFragment);
    setStatus(fromFragment && clientId && redirectUri ? 'form' : 'invalid-link');
  }, [clientId, redirectUri]);

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
    () =>
      z
        .object({ password: passwordPolicySchema, confirmPassword: z.string() })
        .refine((data) => data.password === data.confirmPassword, {
          message: 'errors.validation.passwordMismatch',
          path: ['confirmPassword'],
        }),
    []
  );
  type FormValues = z.infer<typeof schema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });
  const passwordValue = useWatch({ control: form.control, name: 'password', defaultValue: '' });

  const onSubmit = async (values: FormValues) => {
    if (!clientId || !redirectUri || !token) {
      setStatus('invalid-link');
      return;
    }
    setError(null);
    try {
      await completeProjectPasswordReset({
        clientId,
        redirectUri,
        token,
        password: values.password,
      });
      setToken(null);
      setStatus('success');
    } catch (e) {
      if (e instanceof ProjectOAuthApiError && e.status === 429) {
        setError(t('tooManyRequests'));
      } else if (
        e instanceof ProjectOAuthApiError &&
        e.status === 400 &&
        e.body.code === 'BAD_USER_INPUT'
      ) {
        // The password was refused, the token was not used: let the person try another.
        setError(t('passwordRejected'));
      } else if (e instanceof ProjectOAuthApiError && e.status === 400) {
        setToken(null);
        setStatus('invalid-link');
      } else {
        setError(t('somethingWentWrong'));
      }
    }
  };

  if (status === 'loading') {
    return <p className="text-muted-foreground">{t('loading')}</p>;
  }

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
  const primaryStyle = oauthPrimaryButtonStyle(appInfo?.primaryColor);
  const signInHref = buildProjectPasswordSignInHref({
    clientId,
    redirectUri,
    clientState,
    scope: scopeParam,
    codeChallenge,
    codeChallengeMethod,
  });

  if (status === 'invalid-link') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>{t('invalidLink.title')}</AlertTitle>
          <AlertDescription>{t('invalidLink.description')}</AlertDescription>
        </Alert>
        <Link
          href={buildProjectPasswordResetHref({
            clientId,
            redirectUri,
            clientState,
            scope: scopeParam,
          })}
        >
          <Button className="w-full" style={primaryStyle}>
            {t('requestNewLink')}
          </Button>
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>{t('success.title')}</AlertTitle>
          <AlertDescription>{t('success.description', { appName })}</AlertDescription>
        </Alert>
        <Link href={signInHref}>
          <Button className="w-full" style={primaryStyle}>
            {t('continueToSignIn')}
          </Button>
        </Link>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('passwordLabel')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder={t('passwordPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <TranslatedFormMessage />
                <PasswordStrengthIndicator password={passwordValue} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder={t('confirmPasswordPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <TranslatedFormMessage />
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
            style={primaryStyle}
          >
            {form.formState.isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
