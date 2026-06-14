'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { CopyCheck } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Avatar, FeatureModuleCard, PrimaryTagSelector } from '@/components/common';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useScopeFromParams } from '@/hooks/common';
import { useResources } from '@/hooks/resources';
import { useTags } from '@/hooks/tags';
import { cn } from '@/lib/utils';

import type { PermissionCreateFormValues } from '../permissions/permission-types';

export function PermissionCreateGeneralCard() {
  const t = useTranslations('permission');
  const tPermissions = useTranslations('permissions');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const form = useFormContext<PermissionCreateFormValues>();
  const nameValue = form.watch('name');
  const tagIds = form.watch('tagIds') ?? [];
  const primaryTagId = form.watch('primaryTagId');
  const resourceId = form.watch('resourceId');
  const { resources } = useResources({ scope: scope!, isActive: true, limit: -1 });
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

  const actionOptions = useMemo(() => {
    if (!resourceId || resourceId === '__none__') return [];
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource?.actions?.length) return [];
    return resource.actions.map((action) => ({ value: action, label: action }));
  }, [resourceId, resources]);

  const useActionSelect = actionOptions.length > 0;

  return (
    <FeatureModuleCard
      title={t('info.generalTitle')}
      description={t('create.generalDescription')}
      collapsible
    >
      <div className="flex items-start gap-4">
        <Avatar
          initial={(nameValue?.trim() || 'P').charAt(0)}
          size="lg"
          icon={<CopyCheck className="h-5 w-5 text-muted-foreground" />}
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
            name="resourceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tPermissions('form.resource')}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('action', '');
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={tPermissions('form.noResourceConnected')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {tPermissions('form.noResourceConnected')}
                    </SelectItem>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="action"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tPermissions('form.action')}</FormLabel>
                <FormControl>
                  {useActionSelect ? (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={tPermissions('form.action')} />
                      </SelectTrigger>
                      <SelectContent>
                        {actionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input {...field} placeholder={tPermissions('form.action')} />
                  )}
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
          <PrimaryTagSelector
            control={form.control}
            name="primaryTagId"
            label={tPermissions('form.primaryTag')}
            items={tags}
            loading={tagsLoading && tagIds.length > 0}
            loadingText={tPermissions('form.tagsLoading')}
            emptyText={tPermissions('form.noTagsAvailable')}
            alwaysVisible
            selectTagsFirstPlaceholder={tPermissions('form.selectTagsFirstForPrimaryTag')}
          />
        </div>
      </div>
    </FeatureModuleCard>
  );
}
