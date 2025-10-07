'use client';

import { useEffect } from 'react';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useTags } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

import { TagCards } from './TagCards';
import { TagTable } from './TagTable';
import { TagView } from './TagViewSwitcher';

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

  const { tags, loading, totalCount } = useTags({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

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

  switch (view) {
    case TagView.CARD:
      return <TagCards />;
    case TagView.TABLE:
    default:
      return <TagTable />;
  }
}
