'use client';

import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { FormControl, FormField, FormItem, TranslatedFormMessage } from '@/components/ui/form';
import { getDocsUrl } from '@/lib/constants';

import type { RoleCreateFormValues } from '../roles/role-types';

export function RoleCreateMetadataCard() {
  const t = useTranslations('role.info');
  const tRoles = useTranslations('roles.form');
  const form = useFormContext<RoleCreateFormValues>();

  return (
    <FeatureModuleCard
      title={t('metadata')}
      description={t('metadataDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={tRoles('metadataInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tRoles('metadataDocsLink'),
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
