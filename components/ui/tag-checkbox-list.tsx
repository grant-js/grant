import React from 'react';

import { Control } from 'react-hook-form';

import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tag } from '@/graphql/generated/types';
import { getTagBorderColorClasses } from '@/lib/tag-colors';
import { cn } from '@/lib/utils';

interface TagCheckboxListProps {
  control: Control<any>;
  name: string;
  label: string;
  items: Tag[];
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
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No tags available',
  error,
  maxHeight = '200px',
  disabled = false,
}: TagCheckboxListProps) {
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
              <ScrollArea className="w-full" style={{ height: maxHeight }}>
                <div className="flex flex-wrap gap-2 pr-4">
                  {items.map((tag) => {
                    const isSelected = field.value?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          const currentValue = field.value || [];
                          if (isSelected) {
                            field.onChange(
                              currentValue.filter((value: string) => value !== tag.id)
                            );
                          } else {
                            field.onChange([...currentValue, tag.id]);
                          }
                        }}
                        disabled={disabled}
                        className={cn(
                          'w-3 h-3 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none relative',
                          getTagBorderColorClasses(tag.color),
                          'bg-transparent',
                          disabled && 'opacity-50 cursor-not-allowed'
                        )}
                        title={tag.name}
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
              </ScrollArea>
            )}
          </div>
          {error && <FormMessage className="text-red-500 text-sm mt-1">{error}</FormMessage>}
        </FormItem>
      )}
    />
  );
}
