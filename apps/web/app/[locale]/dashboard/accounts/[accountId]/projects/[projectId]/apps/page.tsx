'use client';

import { useTranslations } from 'next-intl';

import {
  ProjectAppDeleteDialog,
  ProjectAppEditDialog,
  ProjectAppPagination,
  ProjectAppToolbar,
  ProjectAppViewer,
} from '@/components/features/project-apps';
import { DashboardLayout } from '@/components/layout';
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectAppsPage() {
  const t = useTranslations('projectApps');
  usePageTitle('projectApps');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
      actions={<ProjectAppToolbar />}
      footer={<ProjectAppPagination />}
    >
      <>
        <ProjectAppViewer />
        <ProjectAppEditDialog />
        <ProjectAppDeleteDialog />
      </>
    </DashboardLayout>
  );
}
