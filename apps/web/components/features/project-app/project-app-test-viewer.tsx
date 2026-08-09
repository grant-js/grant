'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FeatureModuleCard } from '@/components/common';
import { FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectApps } from '@/hooks/project-apps';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppTestOauthCard } from './project-app-test-oauth-card';
import { ProjectAppTestScopes } from './project-app-test-scopes';
import { ProjectAppTestSummaryCard } from './project-app-test-summary-card';
import {
  PROJECT_APP_TEST_FORM_ID,
  type ProjectAppTestFormValues,
  testAppSchema,
} from './project-app-test-types';

export type { ProjectAppTestFormValues } from './project-app-test-types';

function generateState(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

  const redirectUris = useMemo(() => projectApp?.redirectUris ?? [], [projectApp?.redirectUris]);
  const hasRedirectUris = redirectUris.length > 0;

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
    if (projectApp && hasRedirectUris) {
      const first = redirectUris[0];
      form.reset({ redirectUri: first ?? '', scopes: [] });
    }
  }, [projectApp, hasRedirectUris, redirectUris, form]);

  const handleSubmit = (values: ProjectAppTestFormValues) => {
    if (!projectApp?.clientId) return;
    const state = generateState();
    const scopeParam = values.scopes?.length ? values.scopes.join(' ') : '';
    const searchParams = new URLSearchParams({
      client_id: projectApp.clientId,
      redirect_uri: values.redirectUri,
      state,
    });
    if (scopeParam) searchParams.set('scope', scopeParam);
    const path = `/${locale}/auth/project?${searchParams.toString()}`;
    window.open(path, '_blank', 'noopener,noreferrer');
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
            <ProjectAppTestOauthCard projectApp={projectApp} />
            <ProjectAppTestScopes />
          </form>
        </Form>
      )}
    </FeatureDetailLayout>
  );
}
