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
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectRolesPage() {
  const t = useTranslations('roles');
  usePageTitle('roles');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
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
