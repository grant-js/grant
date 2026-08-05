'use client';

import { useTranslations } from 'next-intl';
import { Webhook } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Avatar, FeatureModuleCard } from '@/components/common';
import type { WebhookCreateFormValues } from '@/components/features/webhooks/webhook-types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function WebhookCreateGeneralCard() {
  const t = useTranslations('webhooks');
  const form = useFormContext<WebhookCreateFormValues>();
  const descriptionValue = form.watch('description');
  const urlValue = form.watch('url');
  const titleInitial = (descriptionValue || urlValue || 'W').charAt(0).toUpperCase();

  return (
    <FeatureModuleCard
      title={t('detail.info.generalTitle')}
      description={t('create.generalDescription')}
      collapsible
    >
      <div className="flex items-start gap-4">
        <Avatar
          initial={titleInitial}
          size="lg"
          icon={<Webhook className="h-5 w-5 text-muted-foreground" />}
          className="h-16 w-16 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('createDialog.descriptionLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder={t('detail.info.descriptionPlaceholder')}
                    rows={3}
                  />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('createDialog.urlLabel')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('createDialog.urlPlaceholder')}
                    className="font-mono"
                  />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </FeatureModuleCard>
  );
}
