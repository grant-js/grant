'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteProjectDialog } from '@/components/features/projects/DeleteProjectDialog';
import { EditProjectDialog } from '@/components/features/projects/EditProjectDialog';
import { ProjectPagination } from '@/components/features/projects/ProjectPagination';
import { ProjectToolbar } from '@/components/features/projects/ProjectToolbar';
import { ProjectViewer } from '@/components/features/projects/ProjectViewer';
import { usePageTitle } from '@/hooks';
import { useOrganizationScope } from '@/hooks/organizations';

export default function OrganizationProjectsPage() {
  const t = useTranslations('projects');
  usePageTitle('projects');

  // Set the selected organization when this page loads
  useOrganizationScope();

  return (
    <DashboardPageLayout
      title={t('title')}
      actions={<ProjectToolbar />}
      footer={<ProjectPagination />}
    >
      <>
        <ProjectViewer />
        <DeleteProjectDialog />
        <EditProjectDialog />
      </>
    </DashboardPageLayout>
  );
}
