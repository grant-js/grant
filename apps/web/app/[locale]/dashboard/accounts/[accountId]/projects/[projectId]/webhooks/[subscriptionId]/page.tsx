'use client';

import { WebhookDetailPage } from '@/components/features/webhook';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function AccountProjectWebhookDetailPage() {
  return <WebhookDetailPage sidebar={<PersonalProjectSidebar />} />;
}
