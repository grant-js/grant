'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FeatureModuleCard } from '@/components/common';
import { FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectApps } from '@/hooks/project-apps';
import {
  buildProjectOAuthEntryPath,
  getProjectOAuthRelayUrl,
  isProjectOAuthRelayRedirectUri,
  pickProjectOAuthTestRedirectUri,
  PROJECT_OAUTH_MESSAGE_TYPE,
} from '@/lib/project-oauth-authorize.lib';
import {
  createProjectOAuthState,
  ensureProjectOAuthPkceSession,
  loadProjectOAuthTestTokens,
  PROJECT_OAUTH_TEST_TOKENS_PREFIX,
  type ProjectOAuthTokenSnapshot,
} from '@/lib/project-oauth-pkce.lib';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppTestOauthCard } from './project-app-test-oauth-card';
import { ProjectAppTestScopes } from './project-app-test-scopes';
import { ProjectAppTestSummaryCard } from './project-app-test-summary-card';
import { ProjectAppTestTokensCard } from './project-app-test-tokens-card';
import {
  PROJECT_APP_TEST_FORM_ID,
  type ProjectAppTestFormValues,
  testAppSchema,
} from './project-app-test-types';

export type { ProjectAppTestFormValues } from './project-app-test-types';

export function ProjectAppTestViewer() {
  const t = useTranslations('projectApp.test');
  const locale = useLocale();
  const params = useParams();
  const appId = params.appId as string;
  const scope = useScopeFromParams();

  const { projectApps, loading, error } = useProjectApps({
    scope: scope!,
    ids: [appId],
    limit: 1,
  });

  const projectApp = useMemo(() => projectApps[0], [projectApps]);
  const setCurrentProjectApp = useProjectAppsStore((state) => state.setCurrentProjectApp);
  const [tokens, setTokens] = useState<ProjectOAuthTokenSnapshot | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [waitingForTokens, setWaitingForTokens] = useState(false);
  const [flowState, setFlowState] = useState<string | null>(null);

  const redirectUris = useMemo(() => projectApp?.redirectUris ?? [], [projectApp?.redirectUris]);
  const hasRedirectUris = redirectUris.length > 0;
  const [grantCallbackUrl, setGrantCallbackUrl] = useState(`/${locale}/auth/project/relay`);
  const grantCallbackMissing = !redirectUris.some((uri) =>
    isProjectOAuthRelayRedirectUri(uri, locale)
  );

  const form = useForm<ProjectAppTestFormValues>({
    resolver: zodResolver(testAppSchema),
    defaultValues: {
      redirectUri: '',
      scopes: [],
    },
  });

  useEffect(() => {
    setCurrentProjectApp(projectApp || null);
    return () => setCurrentProjectApp(null);
  }, [projectApp, setCurrentProjectApp]);

  useEffect(() => {
    setGrantCallbackUrl(getProjectOAuthRelayUrl(locale));
  }, [locale]);

  useEffect(() => {
    if (projectApp && hasRedirectUris) {
      const preferred = pickProjectOAuthTestRedirectUri(redirectUris, locale);
      form.reset({ redirectUri: preferred || redirectUris[0] || '', scopes: [] });
    }
  }, [projectApp, hasRedirectUris, redirectUris, form, locale]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.type !== PROJECT_OAUTH_MESSAGE_TYPE) return;
      if (flowState && data.state && data.state !== flowState) return;
      if (typeof data.error === 'string') {
        setTokenError(
          typeof data.error_description === 'string' ? data.error_description : data.error
        );
        setWaitingForTokens(false);
        return;
      }
      if (typeof data.access_token === 'string') {
        setTokens({
          accessToken: data.access_token,
          refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : '',
          tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
          expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 0,
          scope: typeof data.scope === 'string' ? data.scope : undefined,
          state: typeof data.state === 'string' ? data.state : (flowState ?? undefined),
        });
        setTokenError(null);
        setWaitingForTokens(false);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [flowState]);

  useEffect(() => {
    if (!flowState) return;
    const stored = loadProjectOAuthTestTokens(flowState);
    if (stored) {
      setTokens(stored);
      setWaitingForTokens(false);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `${PROJECT_OAUTH_TEST_TOKENS_PREFIX}${flowState}` || !event.newValue)
        return;
      const storedTokens = loadProjectOAuthTestTokens(flowState);
      if (storedTokens) {
        setTokens(storedTokens);
        setWaitingForTokens(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [flowState]);

  const handleSubmit = async (values: ProjectAppTestFormValues) => {
    if (!projectApp?.clientId) return;
    const oauthState = createProjectOAuthState();
    await ensureProjectOAuthPkceSession({
      clientId: projectApp.clientId,
      redirectUri: values.redirectUri,
      state: oauthState,
    });
    setFlowState(oauthState);
    setTokens(null);
    setTokenError(null);
    setWaitingForTokens(isProjectOAuthRelayRedirectUri(values.redirectUri, locale));
    const path = buildProjectOAuthEntryPath({
      locale,
      clientId: projectApp.clientId,
      redirectUri: values.redirectUri,
      state: oauthState,
      scope: values.scopes?.length ? values.scopes.join(' ') : undefined,
    });
    if (isProjectOAuthRelayRedirectUri(values.redirectUri, locale)) {
      window.open(path, 'grant-project-oauth-test', 'width=480,height=720');
    } else {
      window.open(path, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading && !projectApp) {
    return <div>{t('loading')}</div>;
  }

  if (error || !projectApp) {
    return <div>{t('error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <ProjectAppTestSummaryCard projectApp={projectApp} />

      {!hasRedirectUris ? (
        <FeatureModuleCard
          title={t('configuration.title')}
          description={t('configuration.description')}
          collapsible
        >
          <p className="text-sm text-muted-foreground">{t('noRedirectUris')}</p>
        </FeatureModuleCard>
      ) : (
        <Form {...form}>
          <form
            id={PROJECT_APP_TEST_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <ProjectAppTestOauthCard
              projectApp={projectApp}
              grantCallbackUrl={grantCallbackUrl}
              grantCallbackMissing={grantCallbackMissing}
            />
            <ProjectAppTestScopes />
            {(waitingForTokens || tokens || tokenError) && (
              <ProjectAppTestTokensCard
                tokens={tokens}
                error={tokenError}
                waiting={waitingForTokens}
              />
            )}
          </form>
        </Form>
      )}
    </FeatureDetailLayout>
  );
}
