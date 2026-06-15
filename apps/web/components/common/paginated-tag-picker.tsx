'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Scope, Tag } from '@grantjs/schema';
import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInfiniteScroll } from '@/hooks/common';
import { usePaginatedTags } from '@/hooks/tags';

export interface PaginatedTagPickerProps {
  scope: Scope;
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onClearAll?: () => void;
  maxHeight?: number;
}

export function PaginatedTagPicker({
  scope,
  selectedTagIds,
  onToggle,
  onClearAll,
  maxHeight = 200,
}: PaginatedTagPickerProps) {
  const t = useTranslations('common');
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

  const isInitialLoading = loading && tags.length === 0;
  const isLoadingMore = loading && page > 1;

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('tags.title')}</span>
        {onClearAll && selectedTagIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-auto p-1 text-xs">
            {t('tags.clearAll')}
          </Button>
        )}
      </div>
      <Input
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={t('tags.searchPlaceholder')}
        className="h-8"
      />
      {isInitialLoading ? (
        <div className="text-sm text-muted-foreground p-2">{t('tags.loading')}</div>
      ) : tags.length === 0 ? (
        <div className="text-sm text-muted-foreground p-2">{t('tags.empty')}</div>
      ) : (
        <div
          ref={containerRef}
          className="min-h-0 overflow-y-auto overscroll-contain space-y-1 pr-2"
          style={{ maxHeight }}
        >
          {tags.map((tag: Tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.id)}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3 h-3 shrink-0 rounded-full border-2 bg-transparent ${getTagBorderClasses(tag.color as TagColor)}`}
                  />
                  <span className="truncate">{tag.name}</span>
                </div>
                {isSelected && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
          {hasNextPage && <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />}
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
