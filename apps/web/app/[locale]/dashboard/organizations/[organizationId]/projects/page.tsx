'use client';

import { useTranslations } from 'next-intl';

import {
  ProjectDeleteDialog,
  ProjectEditDialog,
  ProjectPagination,
  ProjectToolbar,
  ProjectViewer,
} from '@/components/features/projects';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationProjectsPage() {
  const t = useTranslations('projects');
  usePageTitle('projects');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationSidebar />}
      actions={<ProjectToolbar />}
      footer={<ProjectPagination />}
    >
      <>
        <ProjectViewer />
        <ProjectDeleteDialog />
        <ProjectEditDialog />
      </>
    </DashboardLayout>
  );
}
