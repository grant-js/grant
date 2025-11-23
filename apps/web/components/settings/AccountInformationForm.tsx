'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUsernameValidation } from '@/hooks/accounts/useUsernameValidation';
import { AccountSettingsFormValues, accountSettingsSchema } from '@/lib/schemas/settings';

interface AccountInformationFormProps {
  defaultValues: AccountSettingsFormValues;
  accountId?: string;
  onSubmit: (values: AccountSettingsFormValues) => Promise<void>;
}

export function AccountInformationForm({
  defaultValues,
  accountId,
  onSubmit,
}: AccountInformationFormProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isChecking,
    isAvailable,
    checkUsername,
    reset: resetUsernameValidation,
  } = useUsernameValidation();

  const form = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues,
  });

  const currentUsername = form.watch('slug');

  // Reset form when account changes (account switch)
  useEffect(() => {
    if (accountId) {
      form.reset(defaultValues);
      resetUsernameValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Revalidate form when username availability changes
  useEffect(() => {
    if (currentUsername && currentUsername !== defaultValues.slug && isAvailable !== null) {
      form.trigger('slug');
    }
  }, [isAvailable, currentUsername, defaultValues.slug, form]);

  const handleUsernameChange = (value: string) => {
    form.setValue('slug', value, { shouldDirty: true, shouldValidate: true });

    // Only check availability if username is different from the current one
    // and meets minimum length requirements
    if (value && value.trim().length >= 3 && value !== defaultValues.slug) {
      checkUsername(value);
    }
  };

  const handleSubmit = async (values: AccountSettingsFormValues) => {
    // Check if username is unavailable before submitting
    if (
      values.slug &&
      values.slug !== defaultValues.slug &&
      values.slug.length >= 3 &&
      isAvailable === false
    ) {
      form.setError('slug', {
        type: 'manual',
        message: t('information.fields.username.unavailable'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsCard
      title={t('information.title')}
      description={t('information.description')}
      footer={
        <div className="flex justify-end gap-4 w-full">
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
        <form
          id="account-information-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('information.fields.name.label')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('information.fields.name.placeholder')}
                    {...field}
                    disabled={isSubmitting}
                  />
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
                    {isChecking && field.value !== defaultValues.slug && (
                      <p className="text-sm text-muted-foreground">
                        {t('information.fields.username.checking')}
                      </p>
                    )}
                    {isAvailable === true && field.value !== defaultValues.slug && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {t('information.fields.username.available')}
                      </p>
                    )}
                    {isAvailable === false && field.value !== defaultValues.slug && (
                      <p className="text-sm text-destructive">
                        {t('information.fields.username.unavailable')}
                      </p>
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
