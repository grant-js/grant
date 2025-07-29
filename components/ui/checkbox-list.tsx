import React from 'react';

import { Control } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CheckboxItem {
  id: string;
  name: string;
  description?: string;
}

interface CheckboxListProps {
  control: Control<any>;
  name: string;
  label: string;
  items: CheckboxItem[];
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  error?: string;
  maxHeight?: string;
  disabled?: boolean;
}

export function CheckboxList({
  control,
  name,
  label,
  items,
  loading = false,
  loadingText = 'Loading...',
  emptyText = 'No items available',
  error,
  maxHeight = '200px',
  disabled = false,
}: CheckboxListProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="mb-2">{label}</FormLabel>
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">{loadingText}</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              <ScrollArea className="w-full" style={{ height: maxHeight }}>
                <div className="space-y-2 pr-4">
                  {items.map((item) => (
                    <FormField
                      key={item.id}
                      control={control}
                      name={name}
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-2 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked: boolean) => {
                                  if (disabled) return;
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        field.value?.filter((value: string) => value !== item.id)
                                      );
                                }}
                                disabled={disabled}
                                className="mt-0.75"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">{item.name}</FormLabel>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
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
