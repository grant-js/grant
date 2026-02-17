'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Avatar } from '@/components/common';
import { SettingCard, SettingImageUploadDialog } from '@/components/features/settings';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEmailVerified } from '@/hooks/auth';

import { profileSettingsSchema } from './setting-schemas';
import { SettingProfileFormValues, SettingProfileInformationFormProps } from './setting-types';

export function SettingProfileInformationForm({
  defaultValues,
  onSubmit,
  onUploadPicture,
  currentPictureUrl,
  currentPictureUpdatedAt,
}: SettingProfileInformationFormProps) {
  const t = useTranslations('settings.profile');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const isEmailVerified = useEmailVerified();

  const form = useForm<SettingProfileFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (values: SettingProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingCard
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
              disabled={!form.formState.isDirty || isSubmitting || !isEmailVerified}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            id="profile-information-form"
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
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </SettingCard>

      <SettingCard title={t('avatar.title')} description={t('avatar.description')}>
        <div className="flex items-center gap-6">
          {currentPictureUrl ? (
            <Avatar
              initial={defaultValues.name || 'U'}
              imageUrl={currentPictureUrl}
              cacheBuster={currentPictureUpdatedAt}
              size="lg"
              className="h-24 w-24"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDialogOpen(true)}
              disabled={!isEmailVerified}
            >
              {currentPictureUrl ? t('avatar.changeButton') : t('avatar.uploadButton')}
            </Button>
          </div>
        </div>
      </SettingCard>

      <SettingImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={onUploadPicture}
        currentImageUrl={currentPictureUrl}
      />
    </div>
  );
}
