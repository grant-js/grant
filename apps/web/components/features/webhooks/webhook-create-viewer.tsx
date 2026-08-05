'use client';

import { type ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { EventType } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { WebhookCreateEventsCard } from '@/components/features/webhook/webhook-create-events-card';
import { WebhookCreateGeneralCard } from '@/components/features/webhook/webhook-create-general-card';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { useRouter } from '@/i18n/navigation';
import { getWebhookDetailUrl } from '@/lib/entity-detail-url';
import { useWebhooksStore } from '@/stores/webhooks.store';

import { createWebhookSchema, type WebhookCreateFormValues } from './webhook-types';

const WEBHOOK_CREATE_FORM_ID = 'webhook-create-form';

interface WebhookCreateViewerProps {
  sidebar: ReactNode;
}

export function WebhookCreateViewer({ sidebar }: WebhookCreateViewerProps) {
  const t = useTranslations('webhooks');
  usePageTitle('webhooks.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const projectGrantContext = useProjectGrantContext();
  const { create } = useWebhookSubscriptionMutations(scope);
  const handleSecretRevealed = useWebhooksStore((state) => state.handleSecretRevealed);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.Project, ResourceAction.Create, {
    scope,
    context: projectGrantContext,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<WebhookCreateFormValues>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      url: '',
      description: '',
      eventTypes: [],
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: WebhookCreateFormValues) => {
    if (!scope || !canCreate) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await create({
        url: values.url.trim(),
        eventTypes: values.eventTypes as EventType[],
        description: values.description?.trim() || null,
      });

      handleSecretRevealed(result.secret);
      toast.success(t('subscriptions.createSuccess'));

      router.push(
        getWebhookDetailUrl({
          organizationId: params.organizationId as string | undefined,
          accountId: params.accountId as string | undefined,
          projectId: params.projectId as string,
          subscriptionId: result.id,
        })
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscriptions.createError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!scope || requiresEmailVerification) {
      return null;
    }

    if (isCheckingCreateGrant) {
      return <FullPageLoader />;
    }

    if (!canCreate) {
      return null;
    }

    return (
      <FeatureDetailLayout>
        <Form {...form}>
          <form
            id={WEBHOOK_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <WebhookCreateGeneralCard />
            <WebhookCreateEventsCard />
          </form>
        </Form>
      </FeatureDetailLayout>
    );
  };

  return (
    <DashboardLayout
      title={t('create.title')}
      sidebar={sidebar}
      actions={
        canRenderCreateForm ? (
          <EntityCreateToolbar
            formId={WEBHOOK_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="webhooks"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
