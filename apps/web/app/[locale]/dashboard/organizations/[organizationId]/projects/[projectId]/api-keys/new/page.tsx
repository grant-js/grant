'use client';

import { ApiKeyCreateViewer } from '@/components/features/api-keys/api-key-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function OrganizationProjectApiKeyCreatePage() {
  return <ApiKeyCreateViewer sidebar={<ProjectSidebar />} />;
}
