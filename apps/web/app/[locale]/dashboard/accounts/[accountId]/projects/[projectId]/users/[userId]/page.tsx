'use client';

import { useTranslations } from 'next-intl';

import { DashboardPageLayout } from '@/components/common/dashboard/DashboardPageLayout';
import { UserDetailViewer } from '@/components/features/user/UserDetailViewer';
import { usePageTitle } from '@/hooks';

export default function PersonalProjectUserDetailPage() {
  const t = useTranslations('user');
  usePageTitle('user.detail');

  return (
    <DashboardPageLayout title={t('detail.title')} variant="simple">
      <UserDetailViewer />
    </DashboardPageLayout>
  );
}
