'use client';

import { ResourceCreateViewer } from '@/components/features/resources/resource-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectResourceCreatePage() {
  return <ResourceCreateViewer sidebar={<ProjectSidebar />} />;
}
