'use client';

import { RoleCreateViewer } from '@/components/features/roles/role-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectRoleCreatePage() {
  return <RoleCreateViewer sidebar={<ProjectSidebar />} />;
}
