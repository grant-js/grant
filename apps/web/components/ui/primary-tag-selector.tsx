'use client';

import { useEffect } from 'react';

import { getTagBorderClasses, TagColor } from '@logusgraphics/grant-constants';
import { Tag } from '@logusgraphics/grant-schema';
import { ChevronDownIcon } from 'lucide-react';
import { Control, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface PrimaryTagSelectorProps {
  control: Control<any>;
  name: string;
  label: string;
  items: Array<Tag & { disabled?: boolean }>;
  tagIdsFieldName?: string;
  loading?: boolean;
  loadingText: string;
  emptyText: string;
  error?: string;
  disabled?: boolean;
}

export function PrimaryTagSelector({
  control,
  name,
  label,
  items,
  tagIdsFieldName = 'tagIds',
  loading = false,
  loadingText,
  emptyText,
  error,
  disabled = false,
}: PrimaryTagSelectorProps) {
  const selectedTagIds = useWatch({ control, name: tagIdsFieldName }) || [];
  const availablePrimaryTags = items.filter((tag) => selectedTagIds.includes(tag.id));
  const currentPrimaryTagId = useWatch({ control, name }) || '';
  const { setValue } = useFormContext();

  useEffect(() => {
    if (availablePrimaryTags.length > 0 && !currentPrimaryTagId) {
      setValue(name, availablePrimaryTags[0].id);
    }
    if (availablePrimaryTags.length === 0 && currentPrimaryTagId) {
      setValue(name, '');
    }
    if (
      availablePrimaryTags.length > 0 &&
      currentPrimaryTagId &&
      !availablePrimaryTags.some((tag) => tag.id === currentPrimaryTagId)
    ) {
      setValue(name, availablePrimaryTags[0].id);
    }
  }, [availablePrimaryTags, currentPrimaryTagId, setValue, name]);

  if (selectedTagIds.length === 0) {
    return null;
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: primaryField }) => {
        const selectedPrimaryTag = availablePrimaryTags.find(
          (tag) => tag.id === primaryField.value
        );

        return (
          <FormItem>
            <FormLabel className="mb-2">{label}</FormLabel>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">{loadingText}</div>
              ) : availablePrimaryTags.length === 0 ? (
                <div className="text-sm text-muted-foreground">{emptyText}</div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between',
                        !selectedPrimaryTag && 'text-muted-foreground'
                      )}
                      disabled={disabled}
                    >
                      {selectedPrimaryTag ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full border-2',
                              getTagBorderClasses(selectedPrimaryTag.color as TagColor)
                            )}
                          />
                          {selectedPrimaryTag.name}
                        </div>
                      ) : (
                        'Select primary tag...'
                      )}
                      <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    style={{ width: 'var(--radix-popover-trigger-width)' }}
                  >
                    <div className="max-h-60 overflow-y-auto">
                      {availablePrimaryTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            primaryField.onChange(tag.id);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                            primaryField.value === tag.id && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full border-2',
                              getTagBorderClasses(tag.color as TagColor)
                            )}
                          />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {error && <FormMessage className="text-red-500 text-sm mt-1">{error}</FormMessage>}
          </FormItem>
        );
      }}
    />
  );
}
