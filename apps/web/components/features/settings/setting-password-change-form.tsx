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
import { useEmailVerified } from '@/hooks/auth';

import { changePasswordSchema } from './setting-schemas';
import { PasswordChangeFormProps, PasswordChangeFormValues } from './setting-types';

export function SettingPasswordChangeForm({ onSubmit, onCancel }: PasswordChangeFormProps) {
  const t = useTranslations('settings.security.changePassword');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEmailVerified = useEmailVerified();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const passwordValue = useWatch({
    control: form.control,
    name: 'newPassword',
    defaultValue: '',
  });

  const handleSubmit = async (values: PasswordChangeFormValues) => {
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
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('currentPassword')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('newPassword')}</FormLabel>
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
            <Button type="submit" disabled={isSubmitting || !isEmailVerified}>
              {isSubmitting ? tCommon('saving') : t('submit')}
            </Button>
          </div>
        </form>
      </Form>
    </SettingCard>
  );
}
