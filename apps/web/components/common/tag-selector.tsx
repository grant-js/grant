'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Check, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const { tags, loading } = useTags({ scope: scope!, limit: -1 });

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

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
          <Tag
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
            <DropdownMenuContent align="end" className="w-56" fullWidthOnMobile>
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('tags.title')}</span>
                  {selectedTagIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="h-auto p-1 text-xs"
                    >
                      {t('tags.clearAll')}
                    </Button>
                  )}
                </div>
                {loading ? (
                  <div className="text-sm text-muted-foreground p-2">{t('tags.loading')}</div>
                ) : tags.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">{t('tags.empty')}</div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto">
                    <div className="space-y-1 pr-2">
                      {tags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <DropdownMenuItem
                            key={tag.id}
                            onClick={() => handleTagToggle(tag.id)}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full border-2 bg-transparent ${getTagBorderClasses(tag.color as TagColor)}`}
                              />
                              <span className="text-sm">{tag.name}</span>
                            </div>
                            {isSelected && <Check className="size-4" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
