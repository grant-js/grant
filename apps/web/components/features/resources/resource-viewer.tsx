'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useResources } from '@/hooks/resources';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceCards } from './resource-cards';
import { ResourceTable } from './resource-table';
import { ResourceView } from './resource-types';

export function ResourceViewer() {
  const scope = useScopeFromParams();
  const view = useResourcesStore((state) => state.view);
  const page = useResourcesStore((state) => state.page);
  const limit = useResourcesStore((state) => state.limit);
  const search = useResourcesStore((state) => state.search);
  const sort = useResourcesStore((state) => state.sort);
  const selectedTagIds = useResourcesStore((state) => state.selectedTagIds);
  const setTotalCount = useResourcesStore((state) => state.setTotalCount);
  const setResources = useResourcesStore((state) => state.setResources);
  const setLoading = useResourcesStore((state) => state.setLoading);
  const setRefetch = useResourcesStore((state) => state.setRefetch);

  const { resources, loading, totalCount, refetch } = useResources({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setResources(resources);
  }, [resources, setResources]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Resource, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case ResourceView.CARD:
      return <ResourceCards />;
    case ResourceView.TABLE:
    default:
      return <ResourceTable />;
  }
}
