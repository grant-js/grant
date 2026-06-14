'use client';

import { useTranslations } from 'next-intl';

import { ResourceDetailViewer } from '@/components/features/resource';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectResourceDetailPage() {
  const t = useTranslations('resource');
  usePageTitle('resource.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<ProjectSidebar />}>
      <div className="p-4">
        <ResourceDetailViewer />
      </div>
    </DashboardLayout>
  );
}
