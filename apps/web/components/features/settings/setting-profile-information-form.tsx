'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, User } from 'lucide-react';
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
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 group/avatar">
            <Avatar
              initial={defaultValues.name || 'U'}
              imageUrl={currentPictureUrl}
              cacheBuster={currentPictureUpdatedAt}
              icon={<User className="h-9 w-9 text-muted-foreground" />}
              size="lg"
              className="h-20 w-20"
            />
            {isEmailVerified ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
                onClick={() => setIsUploadDialogOpen(true)}
                aria-label={currentPictureUrl ? t('avatar.changeButton') : t('avatar.uploadButton')}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            ) : null}
          </div>
          <Form {...form}>
            <form
              id="profile-information-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="min-w-0 flex-1 space-y-4"
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
