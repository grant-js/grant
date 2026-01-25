'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useTags } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

import { TagCards } from './tag-cards';
import { TagTable } from './tag-table';
import { TagView } from './tag-types';

export function TagViewer() {
  const scope = useScopeFromParams();
  const view = useTagsStore((state) => state.view);
  const page = useTagsStore((state) => state.page);
  const limit = useTagsStore((state) => state.limit);
  const search = useTagsStore((state) => state.search);
  const sort = useTagsStore((state) => state.sort);
  const setTotalCount = useTagsStore((state) => state.setTotalCount);
  const setTags = useTagsStore((state) => state.setTags);
  const setLoading = useTagsStore((state) => state.setLoading);
  const setRefetch = useTagsStore((state) => state.setRefetch);

  const { tags, loading, totalCount, refetch } = useTags({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setTags(tags);
  }, [tags, setTags]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Tag, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case TagView.CARD:
      return <TagCards />;
    case TagView.TABLE:
    default:
      return <TagTable />;
  }
}
