'use client';

import { WebhookCreateViewer } from '@/components/features/webhooks/webhook-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function OrganizationProjectWebhookCreatePage() {
  return <WebhookCreateViewer sidebar={<ProjectSidebar />} />;
}
