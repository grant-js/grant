import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

export interface CheckboxItem {
  id: string;
  name: string;
  description?: string;
}

export interface CheckboxListProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string[] | undefined>;
  label: string;
  items: CheckboxItem[];
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  /** When set, rendered instead of emptyText when items are empty (e.g. Alert). */
  emptyComponent?: React.ReactNode;
  error?: string;
  maxHeight?: string;
  disabled?: boolean;
}

export function CheckboxList<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  label,
  items,
  loading = false,
  loadingText,
  emptyText,
  emptyComponent,
  error,
  maxHeight = '200px',
  disabled = false,
}: CheckboxListProps<TFieldValues>) {
  const t = useTranslations('common');
  const resolvedLoadingText = loadingText ?? t('loading');
  const resolvedEmptyText = emptyText ?? t('noItemsAvailable');
  const renderItems = useCallback(
    () => (
      <div className="space-y-2 pr-4">
        {items.map((item) => (
          <FormField
            key={item.id}
            control={control}
            name={name}
            render={({ field: itemField }) => {
              const selectedValues: string[] = Array.isArray(itemField.value)
                ? (itemField.value as string[])
                : [];
              return (
                <FormItem key={item.id} className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={selectedValues.includes(item.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (disabled) return;
                        return checked
                          ? itemField.onChange([...selectedValues, item.id])
                          : itemField.onChange(selectedValues.filter((value) => value !== item.id));
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
    ),
    [items, control, name, disabled]
  );

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="mb-2">{label}</FormLabel>
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">{resolvedLoadingText}</div>
            ) : items.length === 0 ? (
              (emptyComponent ?? (
                <div className="text-sm text-muted-foreground">{resolvedEmptyText}</div>
              ))
            ) : (
              <div className={cn('space-y-2 overflow-y-auto', `max-h-[${maxHeight}]`)}>
                {renderItems()}
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
