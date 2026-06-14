'use client';

import { GroupCreateViewer } from '@/components/features/groups/group-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectGroupCreatePage() {
  return <GroupCreateViewer sidebar={<ProjectSidebar />} />;
}
