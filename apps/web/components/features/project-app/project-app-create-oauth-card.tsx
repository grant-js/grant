'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

import {
  ChipArray,
  FeatureModuleCard,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppFormData } from '@/hooks/project-apps';

import type { ProjectAppCreateFormValues } from '../project-apps/project-app-types';
import { PROJECT_OAUTH_PROVIDER_OPTIONS } from '../project-apps/project-app-types';
import { ProjectAppEnabledProvidersField } from './project-app-enabled-providers-field';

export function ProjectAppCreateOauthCard() {
  const t = useTranslations('projectApp.oauth');
  const tProjectApps = useTranslations('projectApps');
  const scope = useScopeFromParams();
  const form = useFormContext<ProjectAppCreateFormValues>();
  const projectId = useMemo(() => (scope?.id ? scope.id.split(':')[1] : undefined), [scope]);
  const { projectRoles } = useProjectAppFormData(scope, projectId);

  const allowSignUp = form.watch('allowSignUp');

  const providerItems = useMemo(
    () =>
      PROJECT_OAUTH_PROVIDER_OPTIONS.map((opt) => ({
        id: opt.id,
        name: tProjectApps(opt.nameKey),
      })),
    [tProjectApps]
  );

  return (
    <FeatureModuleCard title={t('title')} description={t('description')} collapsible>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="redirectUris"
          render={() => (
            <FormItem>
              <FormLabel>{tProjectApps('form.redirectUris')}</FormLabel>
              <FormControl>
                <ChipArray
                  control={form.control}
                  name="redirectUris"
                  placeholder={tProjectApps('form.redirectUrisPlaceholder')}
                />
              </FormControl>
              <TranslatedFormMessage />
            </FormItem>
          )}
        />
        <ProjectAppEnabledProvidersField
          control={form.control}
          name="enabledProviders"
          label={tProjectApps('form.enabledProviders')}
          items={providerItems}
          emptyText={tProjectApps('form.noProvidersAvailable')}
        />
        <div className="space-y-3">
          <FormLabel>{tProjectApps('form.signUp')}</FormLabel>
          <FormField
            control={form.control}
            name="allowSignUp"
            render={({ field }) => (
              <FormItem className={SWITCH_FIELD_ROW_CLASS}>
                <FormLabel className={SWITCH_FIELD_ROW_LABEL_CLASS}>
                  {tProjectApps('form.enableSignUp')}
                </FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          {allowSignUp !== false && (
            <FormField
              control={form.control}
              name="signUpRoleId"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tProjectApps('form.signUpRolePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>
    </FeatureModuleCard>
  );
}
