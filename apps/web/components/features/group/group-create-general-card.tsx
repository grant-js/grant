'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Group as GroupIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useScopeFromParams } from '@/hooks/common';
import { useTags } from '@/hooks/tags';
import { cn } from '@/lib/utils';

import type { GroupCreateFormValues } from '../groups/group-types';

export function GroupCreateGeneralCard() {
  const t = useTranslations('group');
  const tGroups = useTranslations('groups');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const form = useFormContext<GroupCreateFormValues>();
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
          initial={(nameValue?.trim() || 'G').charAt(0)}
          size="lg"
          icon={<GroupIcon className="h-5 w-5 text-muted-foreground" />}
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
            label={tGroups('form.primaryTag')}
            items={tags}
            loading={tagsLoading && tagIds.length > 0}
            loadingText={tGroups('form.tagsLoading')}
            emptyText={tGroups('form.noTagsAvailable')}
            alwaysVisible
            selectTagsFirstPlaceholder={tGroups('form.selectTagsFirstForPrimaryTag')}
          />
        </div>
      </div>
    </FeatureModuleCard>
  );
}
