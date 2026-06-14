'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, GitBranch, LogIn, Mail, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Avatar,
  CopyToClipboard,
  FeatureModuleCard,
  PrimaryTagSelector,
} from '@/components/common';
import { DataTableColGroup } from '@/components/common/data-table-colgroup';
import { SettingImageUploadDialog } from '@/components/features/settings';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProjectUserScope, useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { getCurrentUserId } from '@/lib/auth';
import { detailTableColumnStyle } from '@/lib/detail-table-column-width';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn, formatLocalizedDateTime, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

import {
  USER_DETAIL_CONTENT_COLUMN_CLASS,
  USER_DETAIL_ICON_ONLY_COLUMN,
  USER_DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS,
  USER_DETAIL_TEXT_COLUMN,
  UserDetailTableIconCell,
} from './user-detail-table-layout';

const USER_DETAIL_INFO_FIELD_COLUMN_WIDTH = '240px';

const userGeneralSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  tagIds: z.array(z.string()),
  primaryTagId: z.string().optional(),
});

type UserGeneralFormValues = z.infer<typeof userGeneralSchema>;

function getUserGeneralDefaultValues(user: User): UserGeneralFormValues {
  return {
    name: user.name,
    tagIds: user.tags?.map((tag) => tag.id) ?? [],
    primaryTagId: user.tags?.find((tag) => tag.isPrimary)?.id ?? '',
  };
}

interface UserGeneralCardProps {
  user: User;
  onPictureUpdate?: () => void;
  onAfterUserMutation?: () => void | Promise<unknown>;
}

function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  const trimmedUrl = url.trim();
  return (
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('/')
  );
}

function getAuthMethodIcon(provider: string): LucideIcon {
  switch (provider.toLowerCase()) {
    case 'email':
      return Mail;
    case 'github':
      return GitBranch;
    default:
      return LogIn;
  }
}

function infoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

export function UserGeneralCard({
  user,
  onPictureUpdate,
  onAfterUserMutation,
}: UserGeneralCardProps) {
  const t = useTranslations('user.info');
  const tCommon = useTranslations('common');
  const tUsersForm = useTranslations('users.form');
  const tProjectApps = useTranslations('projectApps');
  const scope = useScopeFromParams();
  const projectScope = useProjectUserScope();
  const mutationScope = projectScope ?? scope;
  const { uploadUserPicture, updateUser } = useUserMutations();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionUserId = useMemo(
    () => (accessToken ? getCurrentUserId(accessToken) : null),
    [accessToken]
  );
  const isSelf = sessionUserId !== null && sessionUserId === user.id;
  const isSelfManagedMember = (user.authenticationMethods?.length ?? 0) > 0;
  const canEditProfileAsViewer = isSelf || !isSelfManagedMember;

  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: mutationScope!,
  });
  const canUploadPicture = useGrant(ResourceSlug.User, ResourceAction.UploadPicture, {
    scope: mutationScope!,
  });
  const canEditProfileFields = canUpdate && canEditProfileAsViewer;
  const canUploadProfilePicture = canUploadPicture && canEditProfileAsViewer;

  const assignedTags = useMemo(() => user.tags ?? [], [user.tags]);
  const assignedTagCount = assignedTags.length;
  const showSaveFooter = canUpdate && (canEditProfileFields || assignedTagCount > 0);

  const defaultValues = useMemo(() => getUserGeneralDefaultValues(user), [user]);

  const form = useForm<UserGeneralFormValues>({
    resolver: zodResolver(userGeneralSchema),
    defaultValues,
  });

  const watchedPrimaryTagId = form.watch('primaryTagId');
  const primaryTag =
    assignedTags.find((tag) => tag.id === watchedPrimaryTagId) ?? getPrimaryTagFromEntity(user);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const validPictureUrl = isValidImageUrl(user.pictureUrl) ? user.pictureUrl : undefined;
  const createdFormatted = formatLocalizedDateTime(user.createdAt);
  const updatedFormatted = formatLocalizedDateTime(user.updatedAt);

  const handleUploadPicture = async (file: string, filename: string, contentType: string) => {
    await uploadUserPicture({
      scope: mutationScope!,
      userId: user.id,
      file,
      filename,
      contentType,
    });
    onPictureUpdate?.();
    await onAfterUserMutation?.();
  };

  const handleSubmit = async (values: UserGeneralFormValues) => {
    if (!mutationScope) return;
    setIsSubmitting(true);
    try {
      await updateUser(user.id, {
        scope: mutationScope,
        ...(canEditProfileFields ? { name: values.name } : {}),
        primaryTagId: values.primaryTagId || undefined,
      });
      await onAfterUserMutation?.();
      form.reset(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const infoRows = useMemo(() => {
    const rows: Array<{
      id: string;
      icon: ReactNode;
      label: string;
      value: ReactNode;
    }> = [
      {
        id: 'userId',
        icon: infoTableIcon(Fingerprint),
        label: t('userId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{user.id}</span>
            <CopyToClipboard text={user.id} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ),
      },
    ];

    for (const method of user.authenticationMethods ?? []) {
      const Icon = getAuthMethodIcon(method.provider);
      rows.push({
        id: `${method.provider}-${method.providerId}`,
        icon: infoTableIcon(Icon),
        label: tProjectApps(
          `providers.${method.provider}` as 'providers.email' | 'providers.github'
        ),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{method.providerId}</span>
            <CopyToClipboard
              text={method.providerId}
              size="sm"
              variant="ghost"
              className="shrink-0"
            />
          </div>
        ),
      });
    }

    rows.push(
      {
        id: 'created',
        icon: infoTableIcon(Calendar),
        label: t('created'),
        value: <span className="font-semibold">{createdFormatted}</span>,
      },
      {
        id: 'updated',
        icon: infoTableIcon(Calendar),
        label: t('updated'),
        value: <span className="font-semibold">{updatedFormatted}</span>,
      }
    );

    return rows;
  }, [user, t, tProjectApps, createdFormatted, updatedFormatted]);

  return (
    <>
      <FeatureModuleCard
        title={t('generalTitle')}
        description={t('generalDescription')}
        collapsible
        footer={
          showSaveFooter ? (
            <div className="flex justify-end gap-3 w-full">
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
                form="user-general-form"
                disabled={!form.formState.isDirty || isSubmitting}
              >
                {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 group/avatar">
            <Avatar
              initial={getInitials(user.name)}
              imageUrl={validPictureUrl}
              cacheBuster={user.updatedAt}
              size="lg"
              className={cn(
                'h-16 w-16',
                primaryTag?.color
                  ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                  : undefined
              )}
            />
            {canUploadProfilePicture && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-0 h-full w-full rounded-full opacity-0 transition-opacity group-hover/avatar:opacity-100 bg-black/50 hover:bg-black/60"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Pencil className="h-5 w-5 text-white" />
              </Button>
            )}
          </div>
          <Form {...form}>
            <form
              id="user-general-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex-1 min-w-0 space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tCommon('fields.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEditProfileFields} />
                    </FormControl>
                    <TranslatedFormMessage />
                  </FormItem>
                )}
              />
              <PrimaryTagSelector
                control={form.control}
                name="primaryTagId"
                label={tUsersForm('primaryTag')}
                items={assignedTags}
                loading={false}
                loadingText={tUsersForm('tagsLoading')}
                emptyText={tUsersForm('noTagsAvailable')}
                alwaysVisible
                selectTagsFirstPlaceholder={tUsersForm('selectTagsFirstForPrimaryTag')}
                disabled={!canUpdate}
              />
            </form>
          </Form>
        </div>
        <div className="mt-6 border-t pt-4">
          <div className="min-w-0 rounded-md border">
            <Table className="table-auto w-max min-w-full">
              <DataTableColGroup
                columns={[
                  { key: 'icon', width: USER_DETAIL_ICON_ONLY_COLUMN.width },
                  { key: 'field', width: USER_DETAIL_INFO_FIELD_COLUMN_WIDTH },
                  { key: 'value' },
                ]}
              />
              <TableHeader>
                <TableRow>
                  <TableHead
                    className={USER_DETAIL_ICON_ONLY_COLUMN.className}
                    style={detailTableColumnStyle(
                      USER_DETAIL_ICON_ONLY_COLUMN.width,
                      USER_DETAIL_ICON_ONLY_COLUMN.columnWidthMode
                    )}
                  />
                  <TableHead
                    className="w-[240px]"
                    style={detailTableColumnStyle(
                      USER_DETAIL_INFO_FIELD_COLUMN_WIDTH,
                      USER_DETAIL_TEXT_COLUMN.columnWidthMode
                    )}
                  >
                    {t('tableField')}
                  </TableHead>
                  <TableHead>{t('tableValue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {infoRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell
                      className={USER_DETAIL_ICON_ONLY_COLUMN.className}
                      style={detailTableColumnStyle(
                        USER_DETAIL_ICON_ONLY_COLUMN.width,
                        USER_DETAIL_ICON_ONLY_COLUMN.columnWidthMode
                      )}
                    >
                      <UserDetailTableIconCell>
                        <Avatar size="sm" initial="" icon={row.icon} />
                      </UserDetailTableIconCell>
                    </TableCell>
                    <TableCell
                      className={USER_DETAIL_ICON_ONLY_PRIMARY_CONTENT_COLUMN_CLASS}
                      style={detailTableColumnStyle(
                        USER_DETAIL_INFO_FIELD_COLUMN_WIDTH,
                        USER_DETAIL_TEXT_COLUMN.columnWidthMode
                      )}
                    >
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                    </TableCell>
                    <TableCell
                      className={cn('whitespace-normal', USER_DETAIL_CONTENT_COLUMN_CLASS)}
                    >
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </FeatureModuleCard>

      <SettingImageUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleUploadPicture}
        currentImageUrl={validPictureUrl}
      />
    </>
  );
}
