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
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectPermissionsPage() {
  const t = useTranslations('permissions');
  usePageTitle('permissions');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
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
