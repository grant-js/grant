'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Avatar,
  CopyToClipboard,
  EntityDetailInfoTable,
  FeatureModuleCard,
  PrimaryTagSelector,
} from '@/components/common';
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
import { useRoleMutations } from '@/hooks/roles';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn, formatLocalizedDateTime } from '@/lib/utils';

const roleGeneralSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
  primaryTagId: z.string().optional(),
});

type RoleGeneralFormValues = z.infer<typeof roleGeneralSchema>;

function getRoleGeneralDefaultValues(role: Role): RoleGeneralFormValues {
  return {
    name: role.name,
    description: role.description ?? '',
    primaryTagId: role.tags?.find((tag) => tag.isPrimary)?.id ?? '',
  };
}

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface RoleGeneralCardProps {
  role: Role;
  onAfterRoleMutation?: () => void | Promise<unknown>;
}

export function RoleGeneralCard({ role, onAfterRoleMutation }: RoleGeneralCardProps) {
  const t = useTranslations('role.info');
  const tCommon = useTranslations('common');
  const tRolesForm = useTranslations('roles.form');
  const scope = useScopeFromParams();
  const { updateRole } = useRoleMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  const assignedTags = useMemo(() => role.tags ?? [], [role.tags]);
  const defaultValues = useMemo(() => getRoleGeneralDefaultValues(role), [role]);

  const form = useForm<RoleGeneralFormValues>({
    resolver: zodResolver(roleGeneralSchema),
    defaultValues,
  });

  const watchedPrimaryTagId = form.watch('primaryTagId');
  const primaryTag =
    assignedTags.find((tag) => tag.id === watchedPrimaryTagId) ?? getPrimaryTagFromEntity(role);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const createdFormatted = formatLocalizedDateTime(role.createdAt);
  const updatedFormatted = formatLocalizedDateTime(role.updatedAt);

  const infoRows = useMemo(
    () => [
      {
        id: 'roleId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('roleId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{role.id}</span>
            <CopyToClipboard text={role.id} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ),
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
      },
    ],
    [role.id, t, createdFormatted, updatedFormatted]
  );

  const handleSubmit = async (values: RoleGeneralFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updateRole(role.id, {
        scope,
        name: values.name,
        description: values.description,
        primaryTagId: values.primaryTagId || undefined,
      });
      await onAfterRoleMutation?.();
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
              form="role-general-form"
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
          initial={role.name.charAt(0)}
          size="lg"
          icon={<Shield className="h-5 w-5 text-muted-foreground" />}
          className={cn(
            'h-16 w-16 shrink-0',
            primaryTag?.color
              ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
              : undefined
          )}
        />
        <Form {...form}>
          <form
            id="role-general-form"
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
              label={tRolesForm('primaryTag')}
              items={assignedTags}
              loading={false}
              loadingText={tRolesForm('tagsLoading')}
              emptyText={tRolesForm('noTagsAvailable')}
              alwaysVisible
              selectTagsFirstPlaceholder={tRolesForm('selectTagsFirstForPrimaryTag')}
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
