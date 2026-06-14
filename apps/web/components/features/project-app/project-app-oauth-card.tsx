'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ProjectApp } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  ChipArray,
  FeatureModuleCard,
  SWITCH_FIELD_ROW_CLASS,
  SWITCH_FIELD_ROW_LABEL_CLASS,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Form,
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
import { useProjectAppFormData, useProjectAppMutations } from '@/hooks/project-apps';

import { PROJECT_OAUTH_PROVIDER_OPTIONS } from '../project-apps/project-app-types';
import { ProjectAppEnabledProvidersField } from './project-app-enabled-providers-field';

const projectAppOauthSchema = z.object({
  redirectUris: z.array(z.string()).min(1, 'errors.validation.redirectUrisMinOne'),
  enabledProviders: z.array(z.string()).optional(),
  allowSignUp: z.boolean().optional(),
  signUpRoleId: z.string().optional().nullable(),
});

type ProjectAppOauthFormValues = z.infer<typeof projectAppOauthSchema>;

function getProjectAppOauthDefaultValues(projectApp: ProjectApp): ProjectAppOauthFormValues {
  return {
    redirectUris: projectApp.redirectUris ?? [],
    enabledProviders: projectApp.enabledProviders ?? [],
    allowSignUp: projectApp.allowSignUp ?? true,
    signUpRoleId: projectApp.signUpRoleId ?? '',
  };
}

interface ProjectAppOauthCardProps {
  projectApp: ProjectApp;
  onAfterProjectAppMutation?: () => void | Promise<unknown>;
}

export function ProjectAppOauthCard({
  projectApp,
  onAfterProjectAppMutation,
}: ProjectAppOauthCardProps) {
  const t = useTranslations('projectApp.oauth');
  const tProjectApps = useTranslations('projectApps');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const projectId = useMemo(() => (scope?.id ? scope.id.split(':')[1] : undefined), [scope]);
  const { projectRoles } = useProjectAppFormData(scope, projectId);
  const { updateProjectApp } = useProjectAppMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
  });

  const defaultValues = useMemo(() => getProjectAppOauthDefaultValues(projectApp), [projectApp]);

  const form = useForm<ProjectAppOauthFormValues>({
    resolver: zodResolver(projectAppOauthSchema),
    defaultValues,
  });

  const allowSignUp = form.watch('allowSignUp');

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const providerItems = useMemo(
    () =>
      PROJECT_OAUTH_PROVIDER_OPTIONS.map((opt) => ({
        id: opt.id,
        name: tProjectApps(opt.nameKey),
      })),
    [tProjectApps]
  );

  const handleSubmit = async (values: ProjectAppOauthFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updateProjectApp(projectApp.id, {
        scope,
        redirectUris: values.redirectUris,
        enabledProviders: values.enabledProviders?.length ? values.enabledProviders : undefined,
        allowSignUp: values.allowSignUp,
        signUpRoleId:
          values.allowSignUp === false
            ? null
            : values.signUpRoleId
              ? values.signUpRoleId
              : undefined,
      });
      await onAfterProjectAppMutation?.();
      form.reset(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={t('title')}
      description={t('description')}
      collapsible
      footer={
        canUpdate ? (
          <div className="flex justify-end gap-3 w-full">
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
              form="project-app-oauth-form"
              disabled={!form.formState.isDirty || isSubmitting}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <Form {...form}>
        <form
          id="project-app-oauth-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
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
                    disabled={!canUpdate}
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
            disabled={!canUpdate}
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
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canUpdate}
                    />
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
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={!canUpdate}
                    >
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
        </form>
      </Form>
    </FeatureModuleCard>
  );
}
