'use client';

import { useTranslations } from 'next-intl';

import {
  UserDeleteDialog,
  UserEditDialog,
  UserPagination,
  UserToolbar,
  UserViewer,
} from '@/components/features/users';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectUsersPage() {
  const t = useTranslations('users');
  usePageTitle('users');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
      actions={<UserToolbar />}
      footer={<UserPagination />}
    >
      <>
        <UserViewer />
        <UserDeleteDialog />
        <UserEditDialog />
      </>
    </DashboardLayout>
  );
}
