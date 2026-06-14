'use client';

import { useEffect, useState } from 'react';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { ChevronDownIcon } from 'lucide-react';
import {
  Control,
  FieldPathByValue,
  FieldValues,
  PathValue,
  useFormContext,
  useWatch,
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, TranslatedFormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface PrimaryTagSelectorProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string | undefined>;
  label: string;
  items: Array<Tag & { disabled?: boolean }>;
  tagIdsFieldName?: FieldPathByValue<TFieldValues, string[] | undefined>;
  loading?: boolean;
  loadingText: string;
  emptyText: string;
  placeholder?: string;
  selectTagsFirstPlaceholder?: string;
  alwaysVisible?: boolean;
  error?: string;
  disabled?: boolean;
}

export function PrimaryTagSelector<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label,
  items,
  tagIdsFieldName,
  loading = false,
  loadingText,
  emptyText,
  placeholder = 'Select primary tag...',
  selectTagsFirstPlaceholder,
  alwaysVisible = false,
  error,
  disabled = false,
}: PrimaryTagSelectorProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const resolvedTagIdsFieldName =
    tagIdsFieldName ?? ('tagIds' as FieldPathByValue<TFieldValues, string[] | undefined>);
  const selectedTagIds =
    (useWatch({ control, name: resolvedTagIdsFieldName }) as string[] | undefined) ?? [];
  const noTagsSelected = selectedTagIds.length === 0;
  const availablePrimaryTags =
    selectedTagIds.length > 0 ? items.filter((tag) => selectedTagIds.includes(tag.id)) : items;
  const currentPrimaryTagId = useWatch({ control, name }) || '';
  const { setValue } = useFormContext<TFieldValues>();

  const setPrimaryTagId = (value: string) => {
    setValue(name, value as PathValue<TFieldValues, typeof name>);
  };

  useEffect(() => {
    if (noTagsSelected) {
      if (currentPrimaryTagId) {
        setPrimaryTagId('');
      }
      return;
    }

    if (availablePrimaryTags.length > 0 && !currentPrimaryTagId) {
      setPrimaryTagId(availablePrimaryTags[0].id);
    }
    if (availablePrimaryTags.length === 0 && currentPrimaryTagId) {
      setPrimaryTagId('');
    }
    if (
      availablePrimaryTags.length > 0 &&
      currentPrimaryTagId &&
      !availablePrimaryTags.some((tag) => tag.id === currentPrimaryTagId)
    ) {
      setPrimaryTagId(availablePrimaryTags[0].id);
    }
  }, [availablePrimaryTags, currentPrimaryTagId, noTagsSelected, name, setValue]);

  if (!alwaysVisible && availablePrimaryTags.length === 0) {
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
              ) : noTagsSelected && alwaysVisible ? (
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between text-muted-foreground"
                  disabled
                >
                  {selectTagsFirstPlaceholder ?? emptyText}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              ) : availablePrimaryTags.length === 0 ? (
                <div className="text-sm text-muted-foreground">{emptyText}</div>
              ) : (
                <Popover open={open} onOpenChange={setOpen}>
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
                        placeholder
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
                            setOpen(false);
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
            {error && (
              <TranslatedFormMessage className="text-destructive text-sm mt-1">
                {error}
              </TranslatedFormMessage>
            )}
          </FormItem>
        );
      }}
    />
  );
}
