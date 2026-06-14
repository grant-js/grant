'use client';

import { useTranslations } from 'next-intl';

import { ProjectAppTestViewer } from '@/components/features/project-app';
import { ProjectAppTestToolbar } from '@/components/features/project-apps';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function AccountProjectAppTestPage() {
  const t = useTranslations('projectApp');
  usePageTitle('projectApp.test');

  return (
    <DashboardLayout
      title={t('test.title')}
      sidebar={<PersonalProjectSidebar />}
      actions={<ProjectAppTestToolbar />}
    >
      <div className="p-4">
        <ProjectAppTestViewer />
      </div>
    </DashboardLayout>
  );
}
