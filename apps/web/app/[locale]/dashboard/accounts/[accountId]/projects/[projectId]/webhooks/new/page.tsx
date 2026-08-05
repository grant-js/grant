'use client';

import { WebhookCreateViewer } from '@/components/features/webhooks/webhook-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function AccountProjectWebhookCreatePage() {
  return <WebhookCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
