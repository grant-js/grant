'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteGroupDialog } from '@/components/features/groups/DeleteGroupDialog';
import { EditGroupDialog } from '@/components/features/groups/EditGroupDialog';
import { GroupPagination } from '@/components/features/groups/GroupPagination';
import { GroupToolbar } from '@/components/features/groups/GroupToolbar';
import { GroupViewer } from '@/components/features/groups/GroupViewer';
import { usePageTitle } from '@/hooks';
export default function OrganizationGroupsPage() {
  const t = useTranslations('groups');
  usePageTitle('groups');

  return (
    <DashboardPageLayout title={t('title')} actions={<GroupToolbar />} footer={<GroupPagination />}>
      <>
        <GroupViewer />
        <DeleteGroupDialog />
        <EditGroupDialog />
      </>
    </DashboardPageLayout>
  );
}
