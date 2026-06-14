'use client';

import { PermissionCreateViewer } from '@/components/features/permissions/permission-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectPermissionCreatePage() {
  return <PermissionCreateViewer sidebar={<ProjectSidebar />} />;
}
