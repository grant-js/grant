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
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectResourcesPage() {
  const t = useTranslations('resources');
  usePageTitle('resources');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
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
