'use client';

import { useTranslations } from 'next-intl';

import {
  WebhookDeleteDialog,
  WebhookPagination,
  WebhookSecretDialog,
  WebhookSubscriptionViewer,
  WebhookToolbar,
} from '@/components/features/webhooks';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectWebhooksPage() {
  const t = useTranslations('webhooks');
  usePageTitle('webhooks');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
      actions={<WebhookToolbar />}
      footer={<WebhookPagination />}
    >
      <WebhookSubscriptionViewer />
      <WebhookDeleteDialog />
      <WebhookSecretDialog />
    </DashboardLayout>
  );
}
