'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { FormControl, FormField, FormItem, TranslatedFormMessage } from '@/components/ui/form';
import { getDocsUrl } from '@/lib/constants';

import type { GroupCreateFormValues } from '../groups/group-types';

export function GroupCreateMetadataCard() {
  const t = useTranslations('group.info');
  const tGroups = useTranslations('groups.form');
  const form = useFormContext<GroupCreateFormValues>();

  return (
    <FeatureModuleCard
      title={t('metadata')}
      description={t('metadataDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={tGroups('metadataInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tGroups('metadataDocsLink'),
          }}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
    >
      <FormField
        control={form.control}
        name="metadata"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <JsonEditor
                value={field.value ?? {}}
                onChange={(value) => field.onChange(value ?? {})}
                className="min-h-[160px]"
              />
            </FormControl>
            <TranslatedFormMessage />
          </FormItem>
        )}
      />
    </FeatureModuleCard>
  );
}
