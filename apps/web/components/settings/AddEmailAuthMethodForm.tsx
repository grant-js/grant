'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { PasswordStrengthIndicator } from '@/components/common/PasswordStrengthIndicator';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { passwordPolicySchema } from '@/lib/validation/password-policy';

const addEmailAuthMethodSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AddEmailAuthMethodFormValues = z.infer<typeof addEmailAuthMethodSchema>;

interface AddEmailAuthMethodFormProps {
  onSubmit: (values: AddEmailAuthMethodFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function AddEmailAuthMethodForm({ onSubmit, onCancel }: AddEmailAuthMethodFormProps) {
  const t = useTranslations('settings.security.addEmailAuthMethod');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddEmailAuthMethodFormValues>({
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

  const handleSubmit = async (values: AddEmailAuthMethodFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  return (
    <SettingsCard title={t('title')} description={t('description')}>
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
                <FormMessage />
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
                <FormMessage />
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
                <FormMessage />
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
    </SettingsCard>
  );
}
