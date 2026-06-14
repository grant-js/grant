'use client';

import { UserCreateViewer } from '@/components/features/users/user-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectUserCreatePage() {
  return <UserCreateViewer sidebar={<ProjectSidebar />} />;
}
