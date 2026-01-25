'use client';

import { useTranslations } from 'next-intl';

import {
  TagDeleteDialog,
  TagEditDialog,
  TagPagination,
  TagToolbar,
  TagViewer,
} from '@/components/features/tags';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationTagsPage() {
  const t = useTranslations('tags');
  usePageTitle('tags');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationSidebar />}
      actions={<TagToolbar />}
      footer={<TagPagination />}
    >
      <>
        <TagViewer />
        <TagDeleteDialog />
        <TagEditDialog />
      </>
    </DashboardLayout>
  );
}
