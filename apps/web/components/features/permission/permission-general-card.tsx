'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, CopyCheck, Fingerprint, Package, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Avatar,
  CopyToClipboard,
  EntityDetailInfoTable,
  FeatureModuleCard,
  PrimaryTagSelector,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn, formatLocalizedDateTime } from '@/lib/utils';

const permissionGeneralSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
  primaryTagId: z.string().optional(),
});

type PermissionGeneralFormValues = z.infer<typeof permissionGeneralSchema>;

function getPermissionGeneralDefaultValues(permission: Permission): PermissionGeneralFormValues {
  return {
    name: permission.name,
    description: permission.description ?? '',
    primaryTagId: permission.tags?.find((tag) => tag.isPrimary)?.id ?? '',
  };
}

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface PermissionGeneralCardProps {
  permission: Permission;
  onAfterPermissionMutation?: () => void | Promise<unknown>;
}

export function PermissionGeneralCard({
  permission,
  onAfterPermissionMutation,
}: PermissionGeneralCardProps) {
  const t = useTranslations('permission.info');
  const tCommon = useTranslations('common');
  const tPermissionsForm = useTranslations('permissions.form');
  const scope = useScopeFromParams();
  const { updatePermission } = usePermissionMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });

  const assignedTags = useMemo(() => permission.tags ?? [], [permission.tags]);
  const defaultValues = useMemo(() => getPermissionGeneralDefaultValues(permission), [permission]);

  const form = useForm<PermissionGeneralFormValues>({
    resolver: zodResolver(permissionGeneralSchema),
    defaultValues,
  });

  const watchedPrimaryTagId = form.watch('primaryTagId');
  const primaryTag =
    assignedTags.find((tag) => tag.id === watchedPrimaryTagId) ??
    getPrimaryTagFromEntity(permission);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const createdFormatted = formatLocalizedDateTime(permission.createdAt);
  const updatedFormatted = formatLocalizedDateTime(permission.updatedAt);

  const infoRows = useMemo(() => {
    const rows = [
      {
        id: 'permissionId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('permissionId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{permission.id}</span>
            <CopyToClipboard text={permission.id} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ),
      },
    ];

    if (permission.resource) {
      rows.push({
        id: 'resource',
        icon: detailInfoTableIcon(Package),
        label: t('resource'),
        value: <Badge variant="outline">{permission.resource.name}</Badge>,
      });
    }

    rows.push(
      {
        id: 'action',
        icon: detailInfoTableIcon(Play),
        label: t('action'),
        value: <Badge variant="secondary">{permission.action}</Badge>,
      },
      {
        id: 'created',
        icon: detailInfoTableIcon(Calendar),
        label: t('created'),
        value: <span className="font-semibold">{createdFormatted}</span>,
      },
      {
        id: 'updated',
        icon: detailInfoTableIcon(Calendar),
        label: t('updated'),
        value: <span className="font-semibold">{updatedFormatted}</span>,
      }
    );

    return rows;
  }, [permission, t, createdFormatted, updatedFormatted]);

  const handleSubmit = async (values: PermissionGeneralFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updatePermission(permission.id, {
        scope,
        name: values.name,
        description: values.description,
        primaryTagId: values.primaryTagId || undefined,
      });
      await onAfterPermissionMutation?.();
      form.reset(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={t('generalTitle')}
      description={t('generalDescription')}
      collapsible
      footer={
        canUpdate ? (
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
              form="permission-general-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex items-start gap-4">
        <Avatar
          initial={permission.name.charAt(0)}
          size="lg"
          icon={<CopyCheck className="h-5 w-5 text-muted-foreground" />}
          className={cn(
            'h-16 w-16 shrink-0',
            primaryTag?.color
              ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
              : undefined
          )}
        />
        <Form {...form}>
          <form
            id="permission-general-form"
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
                    <Input {...field} disabled={!canUpdate} />
                  </FormControl>
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon('fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={!canUpdate} />
                  </FormControl>
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
            <PrimaryTagSelector
              control={form.control}
              name="primaryTagId"
              label={tPermissionsForm('primaryTag')}
              items={assignedTags}
              loading={false}
              loadingText={tPermissionsForm('tagsLoading')}
              emptyText={tPermissionsForm('noTagsAvailable')}
              alwaysVisible
              selectTagsFirstPlaceholder={tPermissionsForm('selectTagsFirstForPrimaryTag')}
              disabled={!canUpdate}
            />
          </form>
        </Form>
      </div>
      <EntityDetailInfoTable
        rows={infoRows}
        fieldColumnHeader={t('tableField')}
        valueColumnHeader={t('tableValue')}
      />
    </FeatureModuleCard>
  );
}
