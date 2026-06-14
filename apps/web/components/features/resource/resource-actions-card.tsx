'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ChipArray, FeatureModuleCard, FieldInfoPopover } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { slugifyAction } from '@/lib/slugify';

const resourceActionsSchema = z.object({
  actions: z.array(z.string()).optional(),
});

type ResourceActionsFormValues = z.infer<typeof resourceActionsSchema>;

interface ResourceActionsCardProps {
  resource: Resource;
  onAfterResourceMutation?: () => void | Promise<unknown>;
}

export function ResourceActionsCard({
  resource,
  onAfterResourceMutation,
}: ResourceActionsCardProps) {
  const t = useTranslations('resource.actions');
  const tResources = useTranslations('resources');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updateResource } = useResourceMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Resource, ResourceAction.Update, {
    scope: scope!,
  });

  const defaultValues: ResourceActionsFormValues = {
    actions: resource.actions ?? [],
  };

  const form = useForm<ResourceActionsFormValues>({
    resolver: zodResolver(resourceActionsSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset({ actions: resource.actions ?? [] });
  }, [resource.id, resource.actions, form]);

  const handleSubmit = async (values: ResourceActionsFormValues) => {
    if (!scope) return;
    setIsSubmitting(true);
    try {
      await updateResource({
        id: resource.id,
        input: {
          scope,
          actions: values.actions,
        },
      });
      await onAfterResourceMutation?.();
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
      titleAdornment={
        <FieldInfoPopover
          description={tResources('form.actionsInfo')}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
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
              form="resource-actions-form"
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
          id="resource-actions-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="min-w-0"
        >
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
                    disabled={!canUpdate}
                  />
                </FormControl>
                <TranslatedFormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FeatureModuleCard>
  );
}
