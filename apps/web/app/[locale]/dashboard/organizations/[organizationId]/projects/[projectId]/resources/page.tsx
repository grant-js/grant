'use client';

import { useTranslations } from 'next-intl';

import {
  ResourceDeleteDialog,
  ResourceEditDialog,
  ResourcePagination,
  ResourceToolbar,
  ResourceViewer,
} from '@/components/features/resources';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectResourcesPage() {
  const t = useTranslations('resources');
  usePageTitle('resources');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
      actions={<ResourceToolbar />}
      footer={<ResourcePagination />}
    >
      <>
        <ResourceViewer />
        <ResourceDeleteDialog />
        <ResourceEditDialog />
      </>
    </DashboardLayout>
  );
}
