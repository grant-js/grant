'use client';

import { GroupCreateViewer } from '@/components/features/groups/group-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function ProjectGroupCreatePage() {
  return <GroupCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
