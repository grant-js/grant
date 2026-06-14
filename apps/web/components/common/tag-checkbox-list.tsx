import { type ReactNode, type RefObject, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { Check } from 'lucide-react';
import { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import { FormField, FormItem, FormLabel, TranslatedFormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export type TagCheckboxListVariant = 'dot' | 'labeled';

export interface TagCheckboxListProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string[] | string | undefined>;
  label: string;
  items: Array<Partial<Tag> & { disabled?: boolean }>;
  multiple?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  error?: string;
  maxHeight?: string;
  disabled?: boolean;
  variant?: TagCheckboxListVariant;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  scrollFooter?: ReactNode;
}

export function TagCheckboxList<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label,
  items,
  multiple = true,
  loading = false,
  loadingText,
  emptyText,
  error,
  maxHeight = '200px',
  disabled = false,
  variant = 'labeled',
  scrollContainerRef,
  scrollFooter,
}: TagCheckboxListProps<TFieldValues>) {
  const t = useTranslations('common');
  const resolvedLoadingText = loadingText ?? t('loading');
  const resolvedEmptyText = emptyText ?? t('noTagsAvailable');

  const renderItems = useCallback(
    (field: { value?: string | string[]; onChange: (value: string | string[]) => void }) => {
      const toggleTag = (tagId: string, isSelected: boolean) => {
        if (multiple) {
          const currentValue = (field.value as string[]) || [];
          field.onChange(
            isSelected ? currentValue.filter((value) => value !== tagId) : [...currentValue, tagId]
          );
        } else {
          field.onChange(tagId);
        }
      };

      if (variant === 'labeled') {
        return (
          <div className="space-y-1 pr-2">
            {items.map((tag) => {
              const isSelected = multiple
                ? (field.value as string[] | undefined)?.includes(tag.id!)
                : field.value === tag.id;
              const isDisabled = tag.disabled || disabled;

              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    if (isDisabled || !tag.id) return;
                    toggleTag(tag.id, !!isSelected);
                  }}
                  disabled={isDisabled}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'w-3 h-3 shrink-0 rounded-full border-2 bg-transparent',
                        getTagBorderClasses(tag.color as TagColor)
                      )}
                    />
                    <span className="truncate">{tag.name}</span>
                  </div>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2 pr-4">
          {items.map((tag) => {
            const isSelected = multiple
              ? (field.value as string[] | undefined)?.includes(tag.id!)
              : field.value === tag.id;
            const isDisabled = tag.disabled || disabled;

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  if (isDisabled || !tag.id) return;
                  toggleTag(tag.id, !!isSelected);
                }}
                disabled={isDisabled}
                className={cn(
                  'w-3 h-3 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none relative',
                  getTagBorderClasses(tag.color as TagColor),
                  'bg-transparent',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                title={`${tag.name}${tag.disabled ? ' (already used)' : ''}`}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    },
    [items, multiple, disabled, variant]
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="mb-2">{label}</FormLabel>
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">{resolvedLoadingText}</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{resolvedEmptyText}</div>
            ) : (
              <div ref={scrollContainerRef} className="overflow-y-auto" style={{ maxHeight }}>
                {renderItems(field)}
                {scrollFooter}
              </div>
            )}
          </div>
          {error && (
            <TranslatedFormMessage className="text-destructive text-sm mt-1">
              {error}
            </TranslatedFormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
