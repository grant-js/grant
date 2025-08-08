'use client';

import { Check, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTags } from '@/hooks';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { getTagBorderColorClasses } from '@/lib/tag-colors';

export interface TagsProps {
  selectedTagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
}

export function Tags({ selectedTagIds, onTagIdsChange }: TagsProps) {
  const t = useTranslations('common');
  const scope = useScopeFromParams();
  const { tags, loading } = useTags({ scope, limit: -1 }); // Get all tags for selection

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

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" className="w-full sm:w-auto">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Tag className="size-4" />
                {selectedTagIds.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {t('tags.selected', { count: selectedTagIds.length })}
                    </span>
                    <div className="flex items-center gap-1 ml-1">
                      {selectedTags.slice(0, 3).map((tag) => (
                        <div
                          key={tag.id}
                          className={`w-2 h-2 rounded-full border-2 bg-transparent ${getTagBorderColorClasses(tag.color)}`}
                          title={tag.name}
                        />
                      ))}
                      {selectedTags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{selectedTags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span>{t('tags.placeholder')}</span>
                )}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
            ) : (
              <ScrollArea className="h-[200px]">
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
                            className={`w-3 h-3 rounded-full border-2 bg-transparent ${getTagBorderColorClasses(tag.color)}`}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </div>
                        {isSelected && <Check className="size-4" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
