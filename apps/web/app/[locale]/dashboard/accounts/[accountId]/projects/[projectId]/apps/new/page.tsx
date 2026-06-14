'use client';

import { ProjectAppCreateViewer } from '@/components/features/project-apps/project-app-create-viewer';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function ProjectAppCreatePage() {
  return <ProjectAppCreateViewer sidebar={<PersonalProjectSidebar />} />;
}
