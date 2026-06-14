'use client';

import { useTranslations } from 'next-intl';
import { Tenant } from '@grantjs/schema';
import { useFormContext } from 'react-hook-form';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { FormControl, FormField, FormItem, TranslatedFormMessage } from '@/components/ui/form';
import { useScopeFromParams } from '@/hooks/common';
import { getDocsUrl } from '@/lib/constants';

import type { UserCreateFormValues } from '../users/user-types';

function isProjectMembershipMetadataScope(scope: { tenant: Tenant } | null | undefined): boolean {
  if (!scope) return false;
  return (
    scope.tenant === Tenant.AccountProject ||
    scope.tenant === Tenant.OrganizationProject ||
    scope.tenant === Tenant.AccountProjectUser ||
    scope.tenant === Tenant.OrganizationProjectUser
  );
}

export function UserCreateMetadataCard() {
  const t = useTranslations('user.info');
  const tUsers = useTranslations('users.form');
  const scope = useScopeFromParams();
  const form = useFormContext<UserCreateFormValues>();

  const description = isProjectMembershipMetadataScope(scope)
    ? `${tUsers('metadataInfo')} ${tUsers('metadataProjectContext')}`
    : tUsers('metadataInfo');

  return (
    <FeatureModuleCard
      title={t('metadata')}
      description={t('metadataDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={description}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tUsers('metadataDocsLink'),
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
