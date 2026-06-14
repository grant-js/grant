'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { FormControl, FormField, FormItem, TranslatedFormMessage } from '@/components/ui/form';
import { getDocsUrl } from '@/lib/constants';

import type { PermissionCreateFormValues } from '../permissions/permission-types';

export function PermissionCreateConditionCard() {
  const t = useTranslations('permission.info');
  const tPermissionsForm = useTranslations('permissions.form');
  const form = useFormContext<PermissionCreateFormValues>();

  return (
    <FeatureModuleCard
      title={t('condition')}
      description={t('conditionDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={tPermissionsForm('conditionInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html`,
            label: tPermissionsForm('conditionDocsLink'),
          }}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
    >
      <FormField
        control={form.control}
        name="condition"
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
