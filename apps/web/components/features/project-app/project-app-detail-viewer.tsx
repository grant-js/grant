'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectApps } from '@/hooks/project-apps';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppGeneralCard } from './project-app-general-card';
import { ProjectAppOauthCard } from './project-app-oauth-card';
import { ProjectAppScopes } from './project-app-scopes';
import { ProjectAppTags } from './project-app-tags';

export function ProjectAppDetailViewer() {
  const t = useTranslations('projectApp');
  const params = useParams();
  const appId = params.appId as string;
  const scope = useScopeFromParams();

  const { projectApps, loading, error, refetch } = useProjectApps({
    scope: scope!,
    ids: [appId],
    limit: 1,
  });

  const projectApp = useMemo(() => projectApps[0], [projectApps]);
  const setCurrentProjectApp = useProjectAppsStore((state) => state.setCurrentProjectApp);

  useEffect(() => {
    setCurrentProjectApp(projectApp || null);
    return () => setCurrentProjectApp(null);
  }, [projectApp, setCurrentProjectApp]);

  if (loading && !projectApp) {
    return <div>{t('loading.title')}</div>;
  }

  if (error || !projectApp) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <ProjectAppGeneralCard projectApp={projectApp} onAfterProjectAppMutation={refetch} />
      <ProjectAppOauthCard projectApp={projectApp} onAfterProjectAppMutation={refetch} />
      <ProjectAppScopes projectApp={projectApp} />
      <ProjectAppTags projectApp={projectApp} />
    </FeatureDetailLayout>
  );
}
