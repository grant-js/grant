'use client';

import { ProjectSyncJobDetailPage } from '@/components/features/project-sync-jobs/project-sync-job-detail-page';
import { ProjectSidebar } from '@/components/navigation';

export default function OrganizationProjectSyncJobDetailPage() {
  return <ProjectSyncJobDetailPage sidebar={<ProjectSidebar />} />;
}
