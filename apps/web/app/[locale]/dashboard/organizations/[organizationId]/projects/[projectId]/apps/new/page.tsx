'use client';

import { ProjectAppCreateViewer } from '@/components/features/project-apps/project-app-create-viewer';
import { ProjectSidebar } from '@/components/navigation';

export default function ProjectAppCreatePage() {
  return <ProjectAppCreateViewer sidebar={<ProjectSidebar />} />;
}
