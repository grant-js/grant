'use client';

import { RoleCreateViewer } from '@/components/features/roles/role-create-viewer';
import { OrganizationSidebar } from '@/components/navigation';

export default function OrganizationRoleCreatePage() {
  return <RoleCreateViewer sidebar={<OrganizationSidebar />} />;
}
