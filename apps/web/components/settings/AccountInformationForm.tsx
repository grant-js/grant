'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { accountSettingsSchema, AccountSettingsFormValues } from '@/lib/schemas/settings';

interface AccountInformationFormProps {
  defaultValues: AccountSettingsFormValues;
  onSubmit: (values: AccountSettingsFormValues) => Promise<void>;
}

export function AccountInformationForm({ defaultValues, onSubmit }: AccountInformationFormProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues,
  });

  const handleSubmit = async (values: AccountSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    form.setValue('slug', value);
    // Username validation will be handled when API integration is added
    // For now, we just update the form value
  };

  return (
    <SettingsCard
      title={t('information.title')}
      description={t('information.description')}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(defaultValues)}
            disabled={!form.formState.isDirty || isSubmitting}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="account-information-form"
            disabled={!form.formState.isDirty || isSubmitting}
          >
            {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form id="account-information-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('information.fields.name.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('information.fields.name.placeholder')} {...field} disabled={isSubmitting} />
                </FormControl>
                <FormDescription>{t('information.fields.name.description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('information.fields.username.label')}</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      placeholder={t('information.fields.username.placeholder')}
                      {...field}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {usernameStatus === 'checking' && (
                      <p className="text-sm text-muted-foreground">{t('information.fields.username.checking')}</p>
                    )}
                    {usernameStatus === 'available' && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('information.fields.username.available')}
                      </p>
                    )}
                    {usernameStatus === 'unavailable' && (
                      <p className="text-sm text-destructive">{t('information.fields.username.unavailable')}</p>
                    )}
                  </div>
                </FormControl>
                <FormDescription>{t('information.fields.username.description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsCard>
  );
}

