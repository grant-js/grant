'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { ApiKeyExpirationPresetsField, FeatureModuleCard } from '@/components/common';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { ProjectApiKeyCreateFormValues } from '../api-keys/api-key-types';

export function ApiKeyCreateGeneralCard() {
  const t = useTranslations('user.apiKeys');
  const form = useFormContext<ProjectApiKeyCreateFormValues>();

  return (
    <FeatureModuleCard
      title={t('create.generalTitle')}
      description={t('create.generalDescription')}
      collapsible
    >
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.name')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('form.namePlaceholder')} />
              </FormControl>
              <TranslatedFormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.description')}</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder={t('form.descriptionPlaceholder')} />
              </FormControl>
              <TranslatedFormMessage />
            </FormItem>
          )}
        />
        <ApiKeyExpirationPresetsField
          disabled={false}
          translationNamespace="user.apiKeys"
          labelKey="form.expiration"
        />
      </div>
    </FeatureModuleCard>
  );
}
