'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { getTagBorderClasses, ResourceAction, ResourceSlug, TagColor } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, Package, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Avatar,
  CopyToClipboard,
  EntityDetailInfoTable,
  FeatureModuleCard,
  PrimaryTagSelector,
  SlugInput,
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { getPrimaryTagFromEntity } from '@/lib/entity-list';
import { cn, formatLocalizedDateTime } from '@/lib/utils';

const resourceGeneralSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  slug: z.string().min(1, 'errors.validation.required'),
  description: z.string().optional(),
  isActive: z.boolean(),
  primaryTagId: z.string().optional(),
});

type ResourceGeneralFormValues = z.infer<typeof resourceGeneralSchema>;

function getResourceGeneralDefaultValues(resource: Resource): ResourceGeneralFormValues {
  return {
    name: resource.name,
    slug: resource.slug,
    description: resource.description ?? '',
    isActive: resource.isActive,
    primaryTagId: resource.tags?.find((tag) => tag.isPrimary)?.id ?? '',
  };
}

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface ResourceGeneralCardProps {
  resource: Resource;
  onAfterResourceMutation?: () => void | Promise<unknown>;
}

export function ResourceGeneralCard({
  resource,
  onAfterResourceMutation,
}: ResourceGeneralCardProps) {
  const t = useTranslations('resource.info');
  const tResources = useTranslations('resources');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updateResource } = useResourceMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Resource, ResourceAction.Update, {
    scope: scope!,
  });

  const assignedTags = useMemo(() => resource.tags ?? [], [resource.tags]);
  const defaultValues = useMemo(() => getResourceGeneralDefaultValues(resource), [resource]);

  const form = useForm<ResourceGeneralFormValues>({
    resolver: zodResolver(resourceGeneralSchema),
    defaultValues,
  });

  const nameValue = form.watch('name');
  const watchedPrimaryTagId = form.watch('primaryTagId');
  const primaryTag =
    assignedTags.find((tag) => tag.id === watchedPrimaryTagId) ?? getPrimaryTagFromEntity(resource);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const createdFormatted = formatLocalizedDateTime(resource.createdAt);
  const updatedFormatted = formatLocalizedDateTime(resource.updatedAt);

  const infoRows = useMemo(
    () => [
      {
        id: 'resourceId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('resourceId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{resource.id}</span>
            <CopyToClipboard text={resource.id} size="sm" variant="ghost" className="shrink-0" />
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
    [resource.id, t, createdFormatted, updatedFormatted]
  );

  const handleSubmit = async (values: ResourceGeneralFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updateResource({
        id: resource.id,
        input: {
          scope,
          name: values.name,
          slug: values.slug,
          description: values.description,
          isActive: values.isActive,
          primaryTagId: values.primaryTagId || undefined,
        },
      });
      await onAfterResourceMutation?.();
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
              form="resource-general-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <Form {...form}>
        <form
          id="resource-general-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="flex items-start gap-4">
            <Avatar
              initial={resource.name.charAt(0)}
              size="lg"
              icon={<Package className="h-5 w-5 text-muted-foreground" />}
              className={cn(
                'h-16 w-16 shrink-0',
                primaryTag?.color
                  ? cn('border-2', getTagBorderClasses(primaryTag.color as TagColor))
                  : undefined
              )}
            />
            <div className="flex-1 min-w-0 space-y-4">
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
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tResources('form.slug')}</FormLabel>
                    <FormControl>
                      <SlugInput
                        value={field.value}
                        onChange={field.onChange}
                        autoSlugifyFrom={nameValue}
                        onAutoSlugify={field.onChange}
                        disabled={!canUpdate}
                      />
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
                label={tResources('form.primaryTag')}
                items={assignedTags}
                loading={false}
                loadingText={tResources('form.tagsLoading')}
                emptyText={tResources('form.noTagsAvailable')}
                alwaysVisible
                selectTagsFirstPlaceholder={tResources('form.selectTagsFirstForPrimaryTag')}
                disabled={!canUpdate}
              />
            </div>
          </div>
          <EntityDetailInfoTable
            rows={[
              ...infoRows,
              {
                id: 'isActive',
                icon: detailInfoTableIcon(ToggleRight),
                label: tResources('form.isActive'),
                value: (
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!canUpdate}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ),
              },
            ]}
            fieldColumnHeader={t('tableField')}
            valueColumnHeader={t('tableValue')}
          />
        </form>
      </Form>
    </FeatureModuleCard>
  );
}
