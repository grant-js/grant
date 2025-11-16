'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { profileSettingsSchema, ProfileSettingsFormValues } from '@/lib/schemas/settings';

interface ProfileInformationFormProps {
  defaultValues: ProfileSettingsFormValues;
  onSubmit: (values: ProfileSettingsFormValues) => Promise<void>;
}

export function ProfileInformationForm({ defaultValues, onSubmit }: ProfileInformationFormProps) {
  const t = useTranslations('settings.profile');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues,
  });

  const handleSubmit = async (values: ProfileSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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
              form="profile-information-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form id="profile-information-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
          </form>
        </Form>
      </SettingsCard>

      <SettingsCard title={t('avatar.title')} description={t('avatar.description')}>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">{t('avatar.comingSoon')}</p>
            <Button variant="outline" size="sm" disabled>
              {t('avatar.uploadButton')}
            </Button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

