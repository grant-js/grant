'use client';

import { UserCreateViewer } from '@/components/features/users/user-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function ProjectUserCreatePage() {
  return <UserCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
