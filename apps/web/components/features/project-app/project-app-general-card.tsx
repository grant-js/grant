'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { ProjectApp } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, LayoutGrid } from 'lucide-react';
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
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppMutations } from '@/hooks/project-apps';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn, formatLocalizedDateTime } from '@/lib/utils';

const projectAppGeneralSchema = z.object({
  name: z.string().max(255, 'errors.validation.nameTooLong').min(1, 'errors.validation.required'),
  primaryTagId: z.string().optional(),
});

type ProjectAppGeneralFormValues = z.infer<typeof projectAppGeneralSchema>;

function getProjectAppGeneralDefaultValues(projectApp: ProjectApp): ProjectAppGeneralFormValues {
  return {
    name: projectApp.name ?? '',
    primaryTagId: projectApp.tags?.find((tag) => tag.isPrimary)?.id ?? '',
  };
}

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface ProjectAppGeneralCardProps {
  projectApp: ProjectApp;
  onAfterProjectAppMutation?: () => void | Promise<unknown>;
}

export function ProjectAppGeneralCard({
  projectApp,
  onAfterProjectAppMutation,
}: ProjectAppGeneralCardProps) {
  const t = useTranslations('projectApp.info');
  const tProjectApps = useTranslations('projectApps');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updateProjectApp } = useProjectAppMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
  });

  const assignedTags = useMemo(() => projectApp.tags ?? [], [projectApp.tags]);
  const defaultValues = useMemo(() => getProjectAppGeneralDefaultValues(projectApp), [projectApp]);

  const form = useForm<ProjectAppGeneralFormValues>({
    resolver: zodResolver(projectAppGeneralSchema),
    defaultValues,
  });

  const watchedPrimaryTagId = form.watch('primaryTagId');
  const primaryTag =
    assignedTags.find((tag) => tag.id === watchedPrimaryTagId) ??
    getPrimaryTagFromEntity(projectApp);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const createdFormatted = formatLocalizedDateTime(projectApp.createdAt);
  const updatedFormatted = formatLocalizedDateTime(projectApp.updatedAt);

  const infoRows = useMemo(
    () => [
      {
        id: 'appId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('appId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{projectApp.id}</span>
            <CopyToClipboard text={projectApp.id} size="sm" variant="ghost" className="shrink-0" />
          </div>
        ),
      },
      {
        id: 'clientId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('clientId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{projectApp.clientId}</span>
            <CopyToClipboard
              text={projectApp.clientId}
              size="sm"
              variant="ghost"
              className="shrink-0"
            />
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
    [projectApp.clientId, projectApp.id, t, createdFormatted, updatedFormatted]
  );

  const handleSubmit = async (values: ProjectAppGeneralFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updateProjectApp(projectApp.id, {
        scope,
        name: values.name.trim(),
        primaryTagId: values.primaryTagId || undefined,
      });
      await onAfterProjectAppMutation?.();
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
              form="project-app-general-form"
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
          initial={(projectApp.name ?? projectApp.clientId).charAt(0)}
          size="lg"
          icon={<LayoutGrid className="h-5 w-5 text-muted-foreground" />}
          className={cn(
            'h-16 w-16 shrink-0',
            primaryTag?.color
              ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
              : undefined
          )}
        />
        <Form {...form}>
          <form
            id="project-app-general-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 min-w-0 space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tProjectApps('form.name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={tProjectApps('form.namePlaceholder')}
                      disabled={!canUpdate}
                    />
                  </FormControl>
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
            <PrimaryTagSelector
              control={form.control}
              name="primaryTagId"
              label={tProjectApps('form.primaryTag')}
              items={assignedTags}
              loading={false}
              loadingText={tProjectApps('form.tagsLoading')}
              emptyText={tProjectApps('form.noTagsAvailable')}
              alwaysVisible
              selectTagsFirstPlaceholder={tProjectApps('form.selectTagsFirstForPrimaryTag')}
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
