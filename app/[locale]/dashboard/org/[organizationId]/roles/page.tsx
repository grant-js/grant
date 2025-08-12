'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteRoleDialog } from '@/components/features/roles/DeleteRoleDialog';
import { EditRoleDialog } from '@/components/features/roles/EditRoleDialog';
import { RolePagination } from '@/components/features/roles/RolePagination';
import { RoleToolbar } from '@/components/features/roles/RoleToolbar';
import { RoleViewer } from '@/components/features/roles/RoleViewer';
import { usePageTitle } from '@/hooks';

export default function OrganizationRolesPage() {
  const t = useTranslations('roles');
  usePageTitle('roles');

  return (
    <DashboardPageLayout title={t('title')} actions={<RoleToolbar />} footer={<RolePagination />}>
      <>
        <RoleViewer />
        <DeleteRoleDialog />
        <EditRoleDialog />
      </>
    </DashboardPageLayout>
  );
}
