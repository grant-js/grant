'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { SettingCard } from '@/components/features/settings';
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
import { useEmailVerified } from '@/hooks/auth';
import { useOrganizationMutations } from '@/hooks/organizations';

import { OrganizationAvatar } from './organization-avatar';
import { type EditOrganizationFormValues, editOrganizationSchema } from './organization-types';

interface OrganizationGeneralSettingsProps {
  organization: Organization;
}

const FORM_ID = 'organization-general-settings-form';

export function OrganizationGeneralSettings({ organization }: OrganizationGeneralSettingsProps) {
  const t = useTranslations('organizations.settings.general');
  const tCommon = useTranslations('common');
  const { updateOrganization } = useOrganizationMutations();
  const isEmailVerified = useEmailVerified();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isGranted: canUpdate, isLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.Update,
    { scope: { tenant: Tenant.Organization, id: organization.id }, returnLoading: true }
  ) as UseGrantResult;

  const defaultValues = useMemo(() => ({ name: organization.name }), [organization.name]);

  const form = useForm<EditOrganizationFormValues>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const readOnly = isLoading || !canUpdate;

  const handleSubmit = async (values: EditOrganizationFormValues) => {
    setIsSubmitting(true);
    try {
      await updateOrganization(organization.id, {
        scope: { tenant: Tenant.Organization, id: organization.id },
        name: values.name,
      });
    } catch {
      // The mutation hook already reported the failure; the form keeps the typed name.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingCard
      title={t('title')}
      description={t('description')}
      footer={
        readOnly ? undefined : (
          <div className="flex justify-end gap-3">
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
              form={FORM_ID}
              disabled={!form.formState.isDirty || isSubmitting || !isEmailVerified}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        )
      }
    >
      <div className="flex items-start gap-4">
        <OrganizationAvatar organization={organization} size="xl" interactive />
        <Form {...form}>
          <form
            id={FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="min-w-0 flex-1 space-y-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('name.placeholder')}
                      {...field}
                      disabled={readOnly || isSubmitting}
                    />
                  </FormControl>
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
            {!isLoading && !canUpdate && (
              <p className="text-sm text-muted-foreground">{t('readOnlyHint')}</p>
            )}
          </form>
        </Form>
      </div>
    </SettingCard>
  );
}
