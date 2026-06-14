'use client';

import { PermissionCreateViewer } from '@/components/features/permissions/permission-create-viewer';
import { OrganizationSidebar } from '@/components/navigation';

export default function OrganizationPermissionCreatePage() {
  return <PermissionCreateViewer sidebar={<OrganizationSidebar />} />;
}
