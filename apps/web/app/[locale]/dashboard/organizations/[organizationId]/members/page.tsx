'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteUserDialog } from '@/components/features/users/DeleteUserDialog';
import { EditUserDialog } from '@/components/features/users/EditUserDialog';
import { UserPagination } from '@/components/features/users/UserPagination';
import { UserToolbar } from '@/components/features/users/UserToolbar';
import { UserViewer } from '@/components/features/users/UserViewer';
import { usePageTitle } from '@/hooks';

export default function OrganizationMembersPage() {
  const t = useTranslations('members');
  usePageTitle('members');

  return (
    <DashboardPageLayout title={t('title')} actions={<UserToolbar />} footer={<UserPagination />}>
      <>
        <UserViewer />
        <DeleteUserDialog />
        <EditUserDialog />
      </>
    </DashboardPageLayout>
  );
}
