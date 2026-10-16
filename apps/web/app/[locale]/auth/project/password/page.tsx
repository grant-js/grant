'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OAuthAppHeading } from '@/components/auth/oauth-app-heading';
import { PasswordInput } from '@/components/common/password-input';
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
  ProjectOAuthApiError,
  signInProjectWithPassword,
  verifyProjectPasswordMfa,
} from '@/lib/project-oauth-api';
import { buildProjectAuthorizeUrl } from '@/lib/project-oauth-authorize.lib';
import {
  createProjectOAuthState,
  ensureProjectOAuthPkceSession,
  isProjectOAuthPasswordViaAuthorize,
  loadProjectOAuthPkceSession,
  markProjectOAuthPasswordViaAuthorize,
} from '@/lib/project-oauth-pkce.lib';
import {
  buildProjectPasswordResetHref,
  PROJECT_PASSWORD_RESET_AVAILABLE,
} from '@/lib/project-password-reset.lib';

type PasswordValues = { email: string; password: string };
type MfaValues = { code: string };

/** The one error each failure maps to; credential failures are deliberately one message. */
function signInErrorKey(
  error: unknown
): 'invalidCredentials' | 'tooManyRequests' | 'sessionExpired' | 'somethingWentWrong' {
  if (error instanceof ProjectOAuthApiError) {
    if (error.status === 401) return 'invalidCredentials';
    if (error.status === 429) return 'tooManyRequests';
    if (error.status === 400) return 'sessionExpired';
  }
  return 'somethingWentWrong';
}

export default function ProjectOAuthPasswordPage() {
  const t = useTranslations('auth.projectOAuth.password');
  const tEntry = useTranslations('auth.projectOAuth.entry');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientState = searchParams.get('client_state');
  const scopeParam = searchParams.get('scope');
  const incomingChallenge = searchParams.get('code_challenge');
  const incomingChallengeMethod = searchParams.get('code_challenge_method');

  const [error, setError] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [preparing, setPreparing] = useState(() => Boolean(clientId && redirectUri));
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

  // Same bootstrap as the email view: arriving without the API state (a direct link) goes
  // through authorize once, which stores the state and the PKCE challenge and comes back here.
  useEffect(() => {
    if (!clientId || !redirectUri) return;
    let cancelled = false;

    const preparePkce = async () => {
      const existing = loadProjectOAuthPkceSession(clientState ?? state);
      const matches =
        existing?.clientId === clientId &&
        existing.redirectUri === redirectUri &&
        isProjectOAuthPasswordViaAuthorize();
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
      markProjectOAuthPasswordViaAuthorize();
      if (cancelled) return;
      window.location.href = buildProjectAuthorizeUrl({
        apiBase: getApiBaseUrl(),
        clientId,
        redirectUri,
        state: session.state,
        provider: 'password',
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

  const passwordSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('invalidEmail')).min(1, t('emailRequired')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t]
  );
  const mfaSchema = useMemo(
    () => z.object({ code: z.string().trim().min(1, t('mfa.codeRequired')) }),
    [t]
  );

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });
  const mfaForm = useForm<MfaValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
    mode: 'onSubmit',
  });

  const continueTo = (redirectUrl: string) => {
    window.location.assign(redirectUrl);
  };

  const onSubmitPassword = async (values: PasswordValues) => {
    if (!clientId || !redirectUri || !state) {
      setError(t('missingParams'));
      return;
    }
    setError(null);
    try {
      const result = await signInProjectWithPassword({
        clientId,
        redirectUri,
        state,
        email: values.email,
        password: values.password,
        locale,
      });
      if (result.status === 'mfa_required') {
        passwordForm.reset({ email: values.email, password: '' });
        setMfaToken(result.mfaToken);
        return;
      }
      continueTo(result.redirectUrl);
    } catch (e) {
      passwordForm.resetField('password');
      setError(t(signInErrorKey(e)));
    }
  };

  const onSubmitMfa = async (values: MfaValues) => {
    if (!mfaToken) return;
    setError(null);
    try {
      const { redirectUrl } = await verifyProjectPasswordMfa({
        mfaToken,
        code: values.code.trim(),
        method: useRecovery ? 'recovery' : 'totp',
      });
      continueTo(redirectUrl);
    } catch (e) {
      mfaForm.reset({ code: '' });
      if (e instanceof ProjectOAuthApiError && e.status === 400) {
        // The challenge is gone (expired, or used up by wrong codes): start over.
        setMfaToken(null);
        setUseRecovery(false);
        setError(t('mfa.expired'));
        return;
      }
      setError(
        e instanceof ProjectOAuthApiError && e.status === 401
          ? t('mfa.invalidCode')
          : t(signInErrorKey(e))
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

  if (preparing) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">{t('preparing')}</p>
      </div>
    );
  }

  const appName = oauthClientDisplayName(appInfo?.name, appInfo?.projectName, tEntry('thisApp'));
  const primaryStyle = oauthPrimaryButtonStyle(appInfo?.primaryColor);

  if (mfaToken) {
    return (
      <div className="space-y-6">
        <OAuthAppHeading
          title={t('mfa.title')}
          name={appName}
          pictureUrl={appInfo?.pictureUrl}
          description={useRecovery ? t('mfa.recoveryDescription') : t('mfa.description')}
        />
        <Form {...mfaForm}>
          <form onSubmit={mfaForm.handleSubmit(onSubmitMfa)} className="space-y-4">
            <FormField
              control={mfaForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{useRecovery ? t('mfa.recoveryLabel') : t('mfa.codeLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="one-time-code"
                      inputMode={useRecovery ? 'text' : 'numeric'}
                      placeholder={
                        useRecovery ? t('mfa.recoveryPlaceholder') : t('mfa.codePlaceholder')
                      }
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
              disabled={mfaForm.formState.isSubmitting}
              style={primaryStyle}
            >
              {mfaForm.formState.isSubmitting ? t('mfa.verifying') : t('mfa.verify')}
            </Button>
          </form>
        </Form>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => {
            setUseRecovery((value) => !value);
            setError(null);
            mfaForm.reset({ code: '' });
          }}
        >
          {useRecovery ? t('mfa.useAuthenticator') : t('mfa.useRecovery')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OAuthAppHeading
        title={tEntry('signInTo', { appName })}
        name={appName}
        pictureUrl={appInfo?.pictureUrl}
        description={t('description')}
      />

      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
          <FormField
            control={passwordForm.control}
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
          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('passwordLabel')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder={t('passwordPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {PROJECT_PASSWORD_RESET_AVAILABLE && (
            <div>
              <Link
                href={buildProjectPasswordResetHref({
                  clientId,
                  redirectUri,
                  state,
                  clientState,
                  scope: scopeParam,
                })}
                className="text-sm text-primary hover:text-primary/80"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={passwordForm.formState.isSubmitting}
            style={primaryStyle}
          >
            {passwordForm.formState.isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
