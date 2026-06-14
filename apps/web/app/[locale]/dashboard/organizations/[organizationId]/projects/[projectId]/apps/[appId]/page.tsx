'use client';

import { useTranslations } from 'next-intl';

import { ProjectAppDetailViewer } from '@/components/features/project-app';
import { ProjectAppDetailToolbar } from '@/components/features/project-apps';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectAppDetailPage() {
  const t = useTranslations('projectApp');
  usePageTitle('projectApp.detail');

  return (
    <DashboardLayout
      title={t('detail.title')}
      sidebar={<ProjectSidebar />}
      actions={<ProjectAppDetailToolbar />}
    >
      <div className="p-4">
        <ProjectAppDetailViewer />
      </div>
    </DashboardLayout>
  );
}
