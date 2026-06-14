'use client';

import { PermissionCreateViewer } from '@/components/features/permissions/permission-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function ProjectPermissionCreatePage() {
  return <PermissionCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
