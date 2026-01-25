'use client';

import { useTranslations } from 'next-intl';

import {
  RoleDeleteDialog,
  RoleEditDialog,
  RolePagination,
  RoleToolbar,
  RoleViewer,
} from '@/components/features/roles';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationRolesPage() {
  const t = useTranslations('roles');
  usePageTitle('roles');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationSidebar />}
      actions={<RoleToolbar />}
      footer={<RolePagination />}
    >
      <>
        <RoleViewer />
        <RoleDeleteDialog />
        <RoleEditDialog />
      </>
    </DashboardLayout>
  );
}
