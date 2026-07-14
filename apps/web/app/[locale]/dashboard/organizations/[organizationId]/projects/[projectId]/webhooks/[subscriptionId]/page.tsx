'use client';

import { WebhookDetailPage } from '@/components/features/webhook';
import { ProjectSidebar } from '@/components/navigation';

export default function OrganizationProjectWebhookDetailPage() {
  return <WebhookDetailPage sidebar={<ProjectSidebar />} />;
}
