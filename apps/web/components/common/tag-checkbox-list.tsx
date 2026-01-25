import { useCallback } from 'react';

import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { Control } from 'react-hook-form';

import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export interface TagCheckboxListProps {
  control: Control<any>;
  name: string;
  label: string;
  items: Array<Partial<Tag> & { disabled?: boolean }>;
  multiple?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  error?: string;
  maxHeight?: string;
  disabled?: boolean;
}

export function TagCheckboxList({
  control,
  name,
  label,
  items,
  multiple = true,
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No tags available',
  error,
  maxHeight = '200px',
  disabled = false,
}: TagCheckboxListProps) {
  const renderItems = useCallback(
    (field: any) => (
      <div className="flex flex-wrap gap-2 pr-4">
        {items.map((tag) => {
          const isSelected = multiple ? field.value?.includes(tag.id) : field.value === tag.id;
          const isDisabled = tag.disabled || disabled;

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                if (isDisabled) return;

                if (multiple) {
                  const currentValue = field.value || [];
                  if (isSelected) {
                    field.onChange(currentValue.filter((value: string) => value !== tag.id));
                  } else {
                    field.onChange([...currentValue, tag.id]);
                  }
                } else {
                  field.onChange(tag.id);
                }
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
    ),
    [items, multiple, disabled]
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
              <div className="text-sm text-muted-foreground">{loadingText}</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              <div className={cn('flex flex-wrap gap-2 overflow-y-auto', `max-h-[${maxHeight}]`)}>
                {renderItems(field)}
              </div>
            )}
          </div>
          {error && <FormMessage className="text-destructive text-sm mt-1">{error}</FormMessage>}
        </FormItem>
      )}
    />
  );
}
