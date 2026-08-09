'use client';

import { useCallback, useEffect, useState } from 'react';
import { Scope, Tag } from '@grantjs/schema';

import { useTags } from './use-tags';

const PAGE_SIZE = 50;

interface UsePaginatedTagsOptions {
  scope: Scope;
  search: string;
  pageSize?: number;
}

export function usePaginatedTags({ scope, search, pageSize = PAGE_SIZE }: UsePaginatedTagsOptions) {
  const [page, setPage] = useState(1);
  const [accumulatedTags, setAccumulatedTags] = useState<Tag[]>([]);

  useEffect(() => {
    setPage(1);
    setAccumulatedTags([]);
  }, [search, scope.id, scope.tenant]);

  const { tags, loading, totalCount, hasNextPage } = useTags({
    scope,
    page,
    limit: pageSize,
    search,
  });

  useEffect(() => {
    if (page === 1) {
      setAccumulatedTags(tags);
      return;
    }
    if (tags.length === 0) {
      return;
    }
    setAccumulatedTags((previous) => {
      const seen = new Set(previous.map((tag) => tag.id));
      const nextTags = tags.filter((tag) => !seen.has(tag.id));
      return nextTags.length > 0 ? [...previous, ...nextTags] : previous;
    });
  }, [tags, page]);

  const loadNextPage = useCallback(() => {
    if (!hasNextPage || loading) {
      return;
    }
    setPage((current) => current + 1);
  }, [hasNextPage, loading]);

  return {
    tags: accumulatedTags,
    loading,
    totalCount,
    hasNextPage,
    loadNextPage,
    page,
    pageSize,
  };
}
