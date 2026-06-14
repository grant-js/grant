'use client';

import { ProjectSyncJobDetailPage } from '@/components/features/project-sync-jobs/project-sync-job-detail-page';
import { PersonalProjectSidebar } from '@/components/navigation';

export default function AccountProjectSyncJobDetailPage() {
  return <ProjectSyncJobDetailPage sidebar={<PersonalProjectSidebar />} />;
}
