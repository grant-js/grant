'use client';

import { useTranslations } from 'next-intl';

import {
  GroupDeleteDialog,
  GroupEditDialog,
  GroupPagination,
  GroupToolbar,
  GroupViewer,
} from '@/components/features/groups';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';
export default function OrganizationGroupsPage() {
  const t = useTranslations('groups');
  usePageTitle('groups');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationSidebar />}
      actions={<GroupToolbar />}
      footer={<GroupPagination />}
    >
      <>
        <GroupViewer />
        <GroupDeleteDialog />
        <GroupEditDialog />
      </>
    </DashboardLayout>
  );
}
