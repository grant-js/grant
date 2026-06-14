'use client';

import { GroupCreateViewer } from '@/components/features/groups/group-create-viewer';
import { OrganizationSidebar } from '@/components/navigation';

export default function OrganizationGroupCreatePage() {
  return <GroupCreateViewer sidebar={<OrganizationSidebar />} />;
}
