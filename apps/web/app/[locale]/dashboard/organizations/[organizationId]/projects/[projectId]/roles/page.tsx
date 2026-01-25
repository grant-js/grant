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
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectRolesPage() {
  const t = useTranslations('roles');
  usePageTitle('roles');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
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
