'use client';

import { KeyboardEvent, useCallback, useState } from 'react';

import { Control } from 'react-hook-form';

import { Chip } from '@/components/common';
import { FormField, FormItem, FormLabel, TranslatedFormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ChipArrayProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  allowDuplicates?: boolean;
  chipVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function ChipArray({
  control,
  name,
  label,
  placeholder = 'Type and press Enter',
  error,
  disabled = false,
  className,
  allowDuplicates = false,
  chipVariant = 'secondary',
}: ChipArrayProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement>,
      currentItems: string[],
      onChange: (value: string[]) => void
    ) => {
      if (disabled) return;

      // Add chip on Space or Tab
      if ((e.key === ' ' || e.key === 'Tab') && inputValue.trim()) {
        e.preventDefault();
        const trimmedValue = inputValue.trim();

        // Prevent duplicates unless allowed
        if (allowDuplicates || !currentItems.includes(trimmedValue)) {
          onChange([...currentItems, trimmedValue]);
          setInputValue('');
        }
      } else if (e.key === 'Backspace' && !inputValue && currentItems.length > 0) {
        // Remove last item when backspace is pressed on empty input
        onChange(currentItems.slice(0, -1));
      }
    },
    [inputValue, disabled, allowDuplicates]
  );

  const handleDelete = useCallback(
    (itemToDelete: string, currentItems: string[], onChange: (value: string[]) => void) => {
      if (disabled) return;
      onChange(currentItems.filter((item) => item !== itemToDelete));
    },
    [disabled]
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const items = field.value || [];

        return (
          <FormItem className={className}>
            {label && <FormLabel className="mb-2">{label}</FormLabel>}
            <div className="space-y-2">
              {/* Input field with chips stacked inline */}
              <div
                className={cn(
                  'flex flex-wrap gap-2 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] min-h-9',
                  'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
                  'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                  disabled && 'pointer-events-none opacity-50 cursor-not-allowed',
                  error && 'border-destructive'
                )}
              >
                {/* Chips displayed inline */}
                {items.map((item: string) => (
                  <Chip
                    key={item}
                    label={item}
                    variant={chipVariant}
                    deletable
                    disabled={disabled}
                    onDelete={() => handleDelete(item, items, field.onChange)}
                  />
                ))}

                {/* Input field for adding new items */}
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, items, field.onChange)}
                  placeholder={items.length === 0 ? placeholder : ''}
                  disabled={disabled}
                  className="flex-1 min-w-[120px] border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto bg-transparent"
                />
              </div>

              {error && (
                <TranslatedFormMessage className="text-destructive text-sm mt-1">
                  {error}
                </TranslatedFormMessage>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}
