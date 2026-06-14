'use client';

import { useTranslations } from 'next-intl';

import { PermissionDetailViewer } from '@/components/features/permission';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectPermissionDetailPage() {
  const t = useTranslations('permission');
  usePageTitle('permission.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<ProjectSidebar />}>
      <div className="p-4">
        <PermissionDetailViewer />
      </div>
    </DashboardLayout>
  );
}
