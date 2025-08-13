'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { DeleteTagDialog } from '@/components/features/tags/DeleteTagDialog';
import { EditTagDialog } from '@/components/features/tags/EditTagDialog';
import { TagPagination } from '@/components/features/tags/TagPagination';
import { TagToolbar } from '@/components/features/tags/TagToolbar';
import { TagViewer } from '@/components/features/tags/TagViewer';
import { usePageTitle } from '@/hooks';

export default function OrganizationTagsPage() {
  const t = useTranslations('tags');
  usePageTitle('tags');

  return (
    <DashboardPageLayout title={t('title')} actions={<TagToolbar />} footer={<TagPagination />}>
      <>
        <TagViewer />
        <DeleteTagDialog />
        <EditTagDialog />
      </>
    </DashboardPageLayout>
  );
}
