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
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectUsersPage() {
  const t = useTranslations('users');
  usePageTitle('users');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
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
