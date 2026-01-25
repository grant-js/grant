'use client';

import { useTranslations } from 'next-intl';

import {
  PermissionDeleteDialog,
  PermissionEditDialog,
  PermissionPagination,
  PermissionToolbar,
  PermissionViewer,
} from '@/components/features/permissions';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectPermissionsPage() {
  const t = useTranslations('permissions');
  usePageTitle('permissions');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
      actions={<PermissionToolbar />}
      footer={<PermissionPagination />}
    >
      <>
        <PermissionViewer />
        <PermissionDeleteDialog />
        <PermissionEditDialog />
      </>
    </DashboardLayout>
  );
}
