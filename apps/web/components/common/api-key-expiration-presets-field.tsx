'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

export const API_KEY_EXPIRATION_PRESETS = ['7d', '30d', '60d', '90d', 'custom', 'none'] as const;
export type ApiKeyExpirationPreset = (typeof API_KEY_EXPIRATION_PRESETS)[number];

const PRESET_DAY_OFFSET: Record<'7d' | '30d' | '60d' | '90d', number> = {
  '7d': 7,
  '30d': 30,
  '60d': 60,
  '90d': 90,
};

/** Calendar day for a fixed-duration preset (from local start of today). */
export function apiKeyPresetExpirationDate(preset: '7d' | '30d' | '60d' | '90d'): Date {
  return startOfDay(addDays(new Date(), PRESET_DAY_OFFSET[preset]));
}

export interface ApiKeyExpirationPresetsFieldProps {
  disabled: boolean;
  translationNamespace: string;
  labelKey: string;
}

export function ApiKeyExpirationPresetsField({
  disabled,
  translationNamespace,
  labelKey,
}: ApiKeyExpirationPresetsFieldProps) {
  const t = useTranslations(translationNamespace);
  const { control, watch, setValue } = useFormContext();
  const preset = watch('expirationPreset') as ApiKeyExpirationPreset | undefined;
  const expiresAt = watch('expiresAt') as Date | undefined;

  const presetOptions = useMemo(() => {
    return (['7d', '30d', '60d', '90d'] as const).map((key) => {
      const d = apiKeyPresetExpirationDate(key);
      return {
        value: key,
        label: t('form.expirationDaysOption', {
          days: PRESET_DAY_OFFSET[key],
          date: format(d, 'PP'),
        }),
      };
    });
  }, [t]);

  const selectedLabel = useMemo(() => {
    if (!preset) return '';
    if (preset === 'custom') {
      if (expiresAt) {
        return t('form.expirationCustomWithDate', { date: format(expiresAt, 'PP') });
      }
      return t('form.expirationCustom');
    }
    if (preset === 'none') {
      return t('form.expirationNone');
    }
    const opt = presetOptions.find((o) => o.value === preset);
    return opt?.label ?? '';
  }, [preset, expiresAt, presetOptions, t]);

  return (
    <div className="space-y-3">
      <FormField
        control={control}
        name="expirationPreset"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(labelKey)}</FormLabel>
            <Select
              disabled={disabled}
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                if (value !== 'custom') {
                  setValue('expiresAt', undefined, { shouldValidate: true });
                }
              }}
            >
              <FormControl>
                <SelectTrigger className="h-auto min-h-9 w-full justify-between py-2 font-normal">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <CalendarIcon className="size-4 shrink-0 opacity-70" aria-hidden />
                    <span className="min-w-0 truncate">
                      {selectedLabel || t('form.selectExpiration')}
                    </span>
                  </div>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {presetOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{t('form.expirationCustom')}</SelectItem>
                <SelectItem value="none">{t('form.expirationNone')}</SelectItem>
              </SelectContent>
            </Select>
            <TranslatedFormMessage className="text-destructive text-sm" />
          </FormItem>
        )}
      />
      {preset === 'custom' && (
        <FormField
          control={control}
          name="expiresAt"
          render={({ field: f }) => (
            <FormItem>
              <FormControl>
                <DatePicker
                  date={f.value as Date | undefined}
                  onDateChange={(d) => f.onChange(d)}
                  placeholder={t('form.expiresAtPlaceholder')}
                  disabled={disabled}
                  minDate={startOfDay(addDays(new Date(), 1))}
                />
              </FormControl>
              <TranslatedFormMessage className="text-destructive text-sm" />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
