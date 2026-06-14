'use client';

import { useCallback, useEffect, useState } from 'react';
import { Scope, Tag } from '@grantjs/schema';
import { Loader2 } from 'lucide-react';

import { TagCheckboxList, TagCheckboxListProps } from '@/components/common/tag-checkbox-list';
import { Input } from '@/components/ui/input';
import { useInfiniteScroll } from '@/hooks/common';
import { usePaginatedTags } from '@/hooks/tags';

export interface PaginatedTagCheckboxListProps extends Omit<
  TagCheckboxListProps,
  'items' | 'loading'
> {
  scope: Scope;
  searchPlaceholder?: string;
}

export function PaginatedTagCheckboxList({
  scope,
  searchPlaceholder = 'Search tags...',
  maxHeight = '200px',
  ...listProps
}: PaginatedTagCheckboxListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { tags, loading, hasNextPage, loadNextPage, page } = usePaginatedTags({
    scope,
    search: debouncedSearch,
  });

  const { containerRef, sentinelRef } = useInfiniteScroll({
    enabled: hasNextPage && tags.length > 0,
    loading,
    onLoadMore: loadNextPage,
  });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const isLoadingMore = loading && page > 1;

  const scrollFooter =
    tags.length > 0 ? (
      <>
        {hasNextPage && <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </>
    ) : null;

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-8"
      />
      <TagCheckboxList
        {...listProps}
        items={tags as Tag[]}
        loading={loading && tags.length === 0}
        maxHeight={maxHeight}
        scrollContainerRef={containerRef}
        scrollFooter={scrollFooter}
      />
    </div>
  );
}
