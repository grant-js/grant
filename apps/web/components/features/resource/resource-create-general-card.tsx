'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Package } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import {
  Avatar,
  FeatureModuleCard,
  PrimaryTagSelector,
  SlugInput,
  SWITCH_FIELD_ROW_CLASS,
  SWITCH_FIELD_ROW_LABEL_CLASS,
} from '@/components/common';
import {
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
import { useTags } from '@/hooks/tags';
import { cn } from '@/lib/utils';

import type { ResourceCreateFormValues } from '../resources/resource-types';

export function ResourceCreateGeneralCard() {
  const t = useTranslations('resource');
  const tResources = useTranslations('resources');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const form = useFormContext<ResourceCreateFormValues>();
  const nameValue = form.watch('name');
  const tagIds = form.watch('tagIds') ?? [];
  const primaryTagId = form.watch('primaryTagId');
  const { tags, loading: tagsLoading } = useTags({
    scope: scope!,
    page: 1,
    limit: tagIds.length,
    ids: tagIds,
  });

  const primaryTag = useMemo(
    () => tags.find((tag) => tag.id === primaryTagId),
    [tags, primaryTagId]
  );

  return (
    <FeatureModuleCard
      title={t('info.generalTitle')}
      description={t('create.generalDescription')}
      collapsible
    >
      <div className="flex items-start gap-4">
        <Avatar
          initial={(nameValue?.trim() || 'R').charAt(0)}
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
                  <Input {...field} />
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
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    autoSlugifyFrom={nameValue}
                    onAutoSlugify={field.onChange}
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
                  <Textarea {...field} rows={3} />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className={SWITCH_FIELD_ROW_CLASS}>
                <FormLabel className={SWITCH_FIELD_ROW_LABEL_CLASS}>
                  {tResources('form.isActive')}
                </FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <PrimaryTagSelector
            control={form.control}
            name="primaryTagId"
            label={tResources('form.primaryTag')}
            items={tags}
            loading={tagsLoading && tagIds.length > 0}
            loadingText={tResources('form.tagsLoading')}
            emptyText={tResources('form.noTagsAvailable')}
            alwaysVisible
            selectTagsFirstPlaceholder={tResources('form.selectTagsFirstForPrimaryTag')}
          />
        </div>
      </div>
    </FeatureModuleCard>
  );
}
