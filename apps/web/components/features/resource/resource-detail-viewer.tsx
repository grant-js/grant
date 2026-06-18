'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FeatureDetailLayout, FeatureDetailSkeleton } from '@/components/layout';
import { useScopeFromParams } from '@/hooks/common';
import { useResources } from '@/hooks/resources';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceActionsCard } from './resource-actions-card';
import { ResourceGeneralCard } from './resource-general-card';
import { ResourceTags } from './resource-tags';

export function ResourceDetailViewer() {
  const t = useTranslations('resource');
  const params = useParams();
  const resourceId = params.resourceId as string;
  const scope = useScopeFromParams();
  const setCurrentResource = useResourcesStore((state) => state.setCurrentResource);

  const { resources, loading, error, refetch } = useResources({
    scope: scope!,
    ids: [resourceId],
    limit: 1,
  });

  const resource = useMemo(() => resources[0], [resources]);

  useEffect(() => {
    setCurrentResource(resource || null);
    return () => {
      setCurrentResource(null);
    };
  }, [resource, setCurrentResource]);

  if (loading && !resource) {
    return (
      <FeatureDetailSkeleton
        cards={[
          { showAvatar: true, showFooter: true, rows: 4 },
          { variant: 'table', rows: 4, showToolbar: true },
          { variant: 'table', rows: 3, showToolbar: true },
        ]}
      />
    );
  }

  if (error || !resource) {
    return <div>{t('loading.error')}</div>;
  }

  return (
    <FeatureDetailLayout>
      <ResourceGeneralCard resource={resource} onAfterResourceMutation={refetch} />
      <ResourceActionsCard resource={resource} onAfterResourceMutation={refetch} />
      <ResourceTags resource={resource} />
    </FeatureDetailLayout>
  );
}
