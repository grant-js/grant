'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import {
  ChipArray,
  FeatureModuleCard,
  FieldInfoPopover,
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
import { Switch } from '@/components/ui/switch';
import { slugifyAction } from '@/lib/slugify';

import type { ResourceCreateFormValues } from '../resources/resource-types';

export function ResourceCreateActionsCard() {
  const t = useTranslations('resource.actions');
  const tResources = useTranslations('resources');
  const form = useFormContext<ResourceCreateFormValues>();

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={tResources('form.actionsInfo')}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
    >
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="actions"
          render={() => (
            <FormItem>
              <FormControl>
                <ChipArray
                  control={form.control}
                  name="actions"
                  placeholder={tResources('form.actionsPlaceholder')}
                  normalizeValue={slugifyAction}
                />
              </FormControl>
              <TranslatedFormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="createPermissions"
          render={({ field }) => (
            <FormItem className={SWITCH_FIELD_ROW_CLASS}>
              <FormLabel className={SWITCH_FIELD_ROW_LABEL_CLASS}>
                {tResources('form.createPermissions')}
              </FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </FeatureModuleCard>
  );
}
