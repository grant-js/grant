'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeletePermissionDialog } from '@/components/features/permissions/DeletePermissionDialog';
import { EditPermissionDialog } from '@/components/features/permissions/EditPermissionDialog';
import { PermissionPagination } from '@/components/features/permissions/PermissionPagination';
import { PermissionToolbar } from '@/components/features/permissions/PermissionToolbar';
import { PermissionViewer } from '@/components/features/permissions/PermissionViewer';
import { usePageTitle } from '@/hooks';

export default function OrganizationPermissionsPage() {
  const t = useTranslations('permissions');
  usePageTitle('permissions');

  return (
    <DashboardPageLayout
      title={t('title')}
      actions={<PermissionToolbar />}
      footer={<PermissionPagination />}
    >
      <>
        <PermissionViewer />
        <DeletePermissionDialog />
        <EditPermissionDialog />
      </>
    </DashboardPageLayout>
  );
}
