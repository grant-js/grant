'use client';

import { Control, FieldPathByValue, FieldValues } from 'react-hook-form';

import {
  SWITCH_FIELD_ROW_CLASS,
  SWITCH_FIELD_ROW_LABEL_CLASS,
} from '@/components/common/switch-field-row';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

export interface OAuthProviderOption {
  id: string;
  name: string;
}

interface ProjectAppEnabledProvidersFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPathByValue<TFieldValues, string[] | undefined>;
  label: string;
  items: OAuthProviderOption[];
  emptyText: string;
  disabled?: boolean;
}

export function ProjectAppEnabledProvidersField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  items,
  emptyText,
  disabled = false,
}: ProjectAppEnabledProvidersFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedValues: string[] = Array.isArray(field.value) ? field.value : [];

        return (
          <FormItem className="space-y-3">
            <FormLabel>{label}</FormLabel>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              <div className="space-y-2">
                {items.map((provider) => {
                  const isEnabled = selectedValues.includes(provider.id);

                  return (
                    <FormItem key={provider.id} className={SWITCH_FIELD_ROW_CLASS}>
                      <FormLabel className={SWITCH_FIELD_ROW_LABEL_CLASS}>
                        {provider.name}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            if (disabled) return;
                            field.onChange(
                              checked
                                ? [...selectedValues, provider.id]
                                : selectedValues.filter((value) => value !== provider.id)
                            );
                          }}
                          disabled={disabled}
                        />
                      </FormControl>
                    </FormItem>
                  );
                })}
              </div>
            )}
            <TranslatedFormMessage />
          </FormItem>
        );
      }}
    />
  );
}
