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
import { PersonalProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectGroupsPage() {
  const t = useTranslations('groups');
  usePageTitle('groups');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<PersonalProjectSidebar />}
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
