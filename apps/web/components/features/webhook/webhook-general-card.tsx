'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { WebhookSubscription } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LucideIcon } from 'lucide-react';
import { Calendar, Fingerprint, ToggleRight, Webhook } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Avatar,
  CopyToClipboard,
  EntityDetailInfoTable,
  FeatureModuleCard,
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { cn, formatLocalizedDateTime } from '@/lib/utils';

const webhookGeneralSchema = z.object({
  url: z.string().url().max(2048),
  description: z.string().max(500).optional(),
  active: z.boolean(),
});

type WebhookGeneralFormValues = z.infer<typeof webhookGeneralSchema>;

function getWebhookGeneralDefaultValues(
  subscription: WebhookSubscription
): WebhookGeneralFormValues {
  return {
    url: subscription.url,
    description: subscription.description ?? '',
    active: subscription.active,
  };
}

function detailInfoTableIcon(Icon: LucideIcon): ReactNode {
  return <Icon className="h-3 w-3 text-muted-foreground" />;
}

interface WebhookGeneralCardProps {
  subscription: WebhookSubscription;
  onAfterWebhookMutation?: () => void | Promise<unknown>;
}

export function WebhookGeneralCard({
  subscription,
  onAfterWebhookMutation,
}: WebhookGeneralCardProps) {
  const t = useTranslations('webhooks.detail.info');
  const tWebhooks = useTranslations('webhooks');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectGrantContext();
  const { update } = useWebhookSubscriptionMutations(scope);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: projectGrantContext,
  });

  const defaultValues = useMemo(() => getWebhookGeneralDefaultValues(subscription), [subscription]);

  const form = useForm<WebhookGeneralFormValues>({
    resolver: zodResolver(webhookGeneralSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const createdFormatted = formatLocalizedDateTime(subscription.createdAt);
  const updatedFormatted = formatLocalizedDateTime(subscription.updatedAt);

  const infoRows = useMemo(
    () => [
      {
        id: 'subscriptionId',
        icon: detailInfoTableIcon(Fingerprint),
        label: t('subscriptionId'),
        value: (
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-semibold">{subscription.id}</span>
            <CopyToClipboard
              text={subscription.id}
              size="sm"
              variant="ghost"
              className="shrink-0"
            />
          </div>
        ),
      },
      {
        id: 'created',
        icon: detailInfoTableIcon(Calendar),
        label: t('created'),
        value: <span className="font-semibold">{createdFormatted}</span>,
      },
      {
        id: 'updated',
        icon: detailInfoTableIcon(Calendar),
        label: t('updated'),
        value: <span className="font-semibold">{updatedFormatted}</span>,
      },
    ],
    [subscription.id, t, createdFormatted, updatedFormatted]
  );

  const handleSubmit = async (values: WebhookGeneralFormValues) => {
    if (!scope) {
      return;
    }
    setIsSubmitting(true);
    try {
      await update(subscription.id, {
        url: values.url.trim(),
        description: values.description?.trim() || null,
        active: values.active,
      });
      await onAfterWebhookMutation?.();
      form.reset(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleInitial = (subscription.description || subscription.url).charAt(0).toUpperCase();

  return (
    <FeatureModuleCard
      title={t('generalTitle')}
      description={t('generalDescription')}
      collapsible
      footer={
        canUpdate ? (
          <div className="flex w-full justify-end gap-3">
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
              form="webhook-general-form"
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
          id="webhook-general-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="flex items-start gap-4">
            <Avatar
              initial={titleInitial}
              size="lg"
              icon={<Webhook className="h-5 w-5 text-muted-foreground" />}
              className={cn('h-16 w-16 shrink-0')}
            />
            <div className="min-w-0 flex-1 space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tWebhooks('createDialog.descriptionLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('descriptionPlaceholder')}
                        disabled={!canUpdate}
                        rows={3}
                      />
                    </FormControl>
                    <TranslatedFormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tWebhooks('createDialog.urlLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={tWebhooks('createDialog.urlPlaceholder')}
                        disabled={!canUpdate}
                        className="font-mono"
                      />
                    </FormControl>
                    <TranslatedFormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <EntityDetailInfoTable
            rows={[
              ...infoRows,
              {
                id: 'active',
                icon: detailInfoTableIcon(ToggleRight),
                label: t('isActive'),
                value: (
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
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
                ),
              },
            ]}
            fieldColumnHeader={t('tableField')}
            valueColumnHeader={t('tableValue')}
          />
        </form>
      </Form>
    </FeatureModuleCard>
  );
}
