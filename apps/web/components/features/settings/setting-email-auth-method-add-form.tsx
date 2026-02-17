'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

import { PasswordInput, PasswordStrengthIndicator } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { addEmailAuthMethodSchema } from './setting-schemas';
import {
  SettingEmailAuthMethodAddFormProps,
  SettingEmailAuthMethodAddFormValues,
} from './setting-types';

export function SettingEmailAuthMethodAddForm({
  onSubmit,
  onCancel,
}: SettingEmailAuthMethodAddFormProps) {
  const t = useTranslations('settings.security.addEmailAuthMethod');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingEmailAuthMethodAddFormValues>({
    resolver: zodResolver(addEmailAuthMethodSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = useWatch({
    control: form.control,
    name: 'password',
    defaultValue: '',
  });

  const handleSubmit = async (values: SettingEmailAuthMethodAddFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return (
    <SettingCard title={t('title')} description={t('description')}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={t('emailPlaceholder')}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password')}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} autoComplete="new-password" disabled={isSubmitting} />
                </FormControl>
                <TranslatedFormMessage />
                <PasswordStrengthIndicator password={passwordValue} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('confirmPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput {...field} autoComplete="new-password" disabled={isSubmitting} />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {tCommon('actions.cancel')}
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon('saving') : t('submit')}
            </Button>
          </div>
        </form>
      </Form>
    </SettingCard>
  );
}
