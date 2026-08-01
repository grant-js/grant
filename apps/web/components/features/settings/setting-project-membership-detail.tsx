'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MyProjectMembership } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Building2, Calendar, Fingerprint, FolderKanban, Pencil, Shield, User } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Avatar, CopyToClipboard, EntityDetailInfoTable, JsonEditor } from '@/components/common';
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
import { formatLocalizedDateTime } from '@/lib/utils';

import { projectMembershipProfileSchema } from './setting-schemas';
import { SettingProjectMembershipProfileFormValues } from './setting-types';

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

export interface SettingProjectMembershipDetailProps {
  membership: MyProjectMembership;
  onSubmit: (values: SettingProjectMembershipProfileFormValues) => Promise<void>;
  onUploadPicture: (file: string, filename: string, contentType: string) => Promise<void>;
}

export function SettingProjectMembershipDetail({
  membership,
  onSubmit,
  onUploadPicture,
}: SettingProjectMembershipDetailProps) {
  const t = useTranslations('settings.projectMemberships');
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const defaultValues: SettingProjectMembershipProfileFormValues = {
    displayName: membership.displayName || '',
  };

  const form = useForm<SettingProjectMembershipProfileFormValues>({
    resolver: zodResolver(projectMembershipProfileSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset({
      displayName: membership.displayName || '',
    });
  }, [membership.displayName, form]);

  const handleSubmit = async (values: SettingProjectMembershipProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const metadataValue = membership.metadata ?? {};
  const scopeLabel = membership.organizationName
    ? membership.organizationName
    : t('list.personalProject');
  const joinedFormatted = formatLocalizedDateTime(membership.joinedAt);

  const overviewRows = useMemo(
    () => [
      {
        id: 'project',
        icon: detailInfoTableIcon(FolderKanban),
        label: t('detail.overview.project'),
        value: <span className="font-semibold">{membership.projectName}</span>,
      },
      {
        id: 'projectId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('detail.overview.projectId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{membership.projectId}</span>
            <CopyToClipboard
              text={membership.projectId}
              size="sm"
              variant="ghost"
              className="shrink-0"
            />
          </div>
        ),
      },
      {
        id: 'scope',
        icon: detailInfoTableIcon(Building2),
        label: t('detail.overview.scope'),
        value: <span className="font-semibold">{scopeLabel}</span>,
      },
      ...(membership.role
        ? [
            {
              id: 'role',
              icon: detailInfoTableIcon(Shield),
              label: t('detail.overview.role'),
              value: <span className="font-semibold">{membership.role}</span>,
            },
          ]
        : []),
      {
        id: 'joined',
        icon: detailInfoTableIcon(Calendar),
        label: t('detail.overview.joined'),
        value: <span className="font-semibold">{joinedFormatted}</span>,
      },
    ],
    [t, membership.projectName, membership.projectId, membership.role, scopeLabel, joinedFormatted]
  );

  return (
    <div className="space-y-6">
      <SettingCard
        title={t('detail.overview.title')}
        description={t('detail.overview.description')}
      >
        <EntityDetailInfoTable
          rows={overviewRows}
          fieldColumnHeader={t('detail.overview.tableField')}
          valueColumnHeader={t('detail.overview.tableValue')}
          withTopSeparator={false}
        />
      </SettingCard>

      <SettingCard
        title={t('detail.profile.title')}
        description={t('detail.profile.description')}
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
              form="project-membership-profile-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 group/avatar">
            <Avatar
              initial={membership.displayName || membership.projectName || 'U'}
              imageUrl={membership.pictureUrl || undefined}
              icon={<User className="h-9 w-9 text-muted-foreground" />}
              size="lg"
              className="h-20 w-20"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
              onClick={() => setIsUploadDialogOpen(true)}
              aria-label={
                membership.pictureUrl
                  ? t('detail.avatar.changeButton')
                  : t('detail.avatar.uploadButton')
              }
            >
              <Pencil className="h-5 w-5 text-white" />
            </Button>
          </div>
          <Form {...form}>
            <form
              id="project-membership-profile-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="min-w-0 flex-1 space-y-4"
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('detail.profile.fields.displayName.label')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('detail.profile.fields.displayName.placeholder')}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('detail.profile.fields.displayName.description')}
                    </FormDescription>
                    <TranslatedFormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </SettingCard>

      <SettingCard
        title={t('detail.metadata.title')}
        description={t('detail.metadata.description')}
      >
        <JsonEditor value={metadataValue} disabled className="min-h-[160px]" />
      </SettingCard>

      <SettingImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={onUploadPicture}
        currentImageUrl={membership.pictureUrl || undefined}
      />
    </div>
  );
}
