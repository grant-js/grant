'use client';

import { ApiKeyCreateViewer } from '@/components/features/api-keys/api-key-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function AccountProjectApiKeyCreatePage() {
  return <ApiKeyCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
