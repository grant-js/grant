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
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectTagsPage() {
  const t = useTranslations('tags');
  usePageTitle('tags');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<ProjectSidebar />}
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
