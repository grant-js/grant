'use client';

import { useTranslations } from 'next-intl';

import { UserDetailViewer } from '@/components/features/user';
import { DashboardLayout } from '@/components/layout';
import { ProjectSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function ProjectUserDetailPage() {
  const t = useTranslations('user');
  usePageTitle('user.detail');

  return (
    <DashboardLayout title={t('detail.title')} sidebar={<ProjectSidebar />} variant="simple">
      <UserDetailViewer />
    </DashboardLayout>
  );
}
