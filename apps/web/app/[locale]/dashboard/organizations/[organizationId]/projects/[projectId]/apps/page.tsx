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
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationProjectAppsPage() {
  const t = useTranslations('projectApps');
  usePageTitle('projectApps');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
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
