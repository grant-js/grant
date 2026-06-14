'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Tag as TagIcon } from 'lucide-react';

import { PaginatedTagPicker } from '@/components/common/paginated-tag-picker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTags } from '@/hooks';
import { useScopeFromParams } from '@/hooks/common';
import { cn } from '@/lib/utils';

export interface TagSelectorProps {
  selectedTagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedTagIds, onTagIdsChange }: TagSelectorProps) {
  const t = useTranslations('common');
  const scope = useScopeFromParams();

  const { tags: selectedTagDetails } = useTags({
    scope: scope!,
    ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    limit: selectedTagIds.length > 0 ? selectedTagIds.length : undefined,
    page: 1,
  });

  const handleTagToggle = (tagId: string) => {
    const newSelectedTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    onTagIdsChange(newSelectedTagIds);
  };

  const handleClearAll = () => {
    onTagIdsChange([]);
  };

  const tooltipText =
    selectedTagIds.length > 0
      ? `${t('tags.selected', { count: selectedTagIds.length })}`
      : t('tags.placeholder');

  const hasSelectedTags = selectedTagIds.length > 0;
  const selectedTags = selectedTagDetails.filter((tag) => selectedTagIds.includes(tag.id));

  if (!scope) {
    return null;
  }

  const buttonContent = (
    <Button
      variant="outline"
      size="default"
      className={cn(
        'w-full sm:w-auto sm:max-[1599px]:aspect-square sm:max-[1599px]:p-2 min-[1600px]:px-4 min-[1600px]:py-2',
        hasSelectedTags &&
          'sm:border-2 sm:border-primary min-[1600px]:border min-[1600px]:border-input'
      )}
    >
      <div className="flex w-full items-center justify-center min-[1600px]:justify-start">
        <div className={cn('flex items-center gap-2 sm:max-[1599px]:gap-0')}>
          <TagIcon
            className={cn(
              'size-4',
              hasSelectedTags && 'sm:text-primary min-[1600px]:text-foreground'
            )}
          />
          {hasSelectedTags ? (
            <div className="flex items-center gap-1">
              <span className="text-sm hidden max-sm:inline min-[1600px]:inline">
                {t('tags.selected', { count: selectedTagIds.length })}
              </span>
              <div className="flex items-center gap-1 ml-1 sm:ml-0 min-[1600px]:ml-1 sm:max-[1599px]:hidden">
                {selectedTags.slice(0, 3).map((tag) => (
                  <div
                    key={tag.id}
                    className={`w-2 h-2 rounded-full border-2 bg-transparent ${getTagBorderClasses(tag.color as TagColor)}`}
                    title={tag.name}
                  />
                ))}
                {selectedTags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{selectedTags.length - 3}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="hidden max-sm:inline min-[1600px]:inline">
              {t('tags.placeholder')}
            </span>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <TooltipProvider>
        <Tooltip>
          <DropdownMenu>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltipText}</TooltipContent>
            <DropdownMenuContent align="end" className="w-56 p-0" fullWidthOnMobile>
              <PaginatedTagPicker
                scope={scope}
                selectedTagIds={selectedTagIds}
                onToggle={handleTagToggle}
                onClearAll={handleClearAll}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
