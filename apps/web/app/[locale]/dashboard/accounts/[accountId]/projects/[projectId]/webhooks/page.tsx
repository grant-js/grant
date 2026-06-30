'use client';

import { WebhookSubscriptionsManager } from '@/components/features/webhooks';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectWebhooksPage() {
  usePageTitle('webhooks');

  return (
    <DashboardLayout title="Webhooks" sidebar={<ProjectSidebar />}>
      <WebhookSubscriptionsManager />
    </DashboardLayout>
  );
}
